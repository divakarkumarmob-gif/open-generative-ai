import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import os from 'os';

function stripAnsiSequences(text) {
    return text.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '');
}

function parseStep(chunk) {
    const text = stripAnsiSequences(String(chunk)).replace(/\r/g, '\n');
    // Pattern like: 1/10 - 7.89s/it or step 1 / 10
    const match = /(\d+)\s*\/\s*(\d+)\s*-\s*([\d.]+s\/it)/i.exec(text) || /step\s+(\d+)\s*\/\s*(\d+)/i.exec(text);
    if (match) {
        const step = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        const speed = match[3] || '';
        return { step, total, speed };
    }
    return null;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { prompt, negativePrompt = '', steps = 20, guidance = 7.5, width = 512, height = 512 } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
        const localAiDir = path.join(appData, 'open-generative-ai', 'local-ai');
        const binPath = path.join(localAiDir, 'bin', process.platform === 'win32' ? 'sd-cli.exe' : 'sd-cli');
        const modelsDir = path.join(localAiDir, 'models');

        if (!fs.existsSync(binPath)) {
            return NextResponse.json({ error: 'sd-cli binary not found in ' + binPath }, { status: 500 });
        }

        const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.safetensors') || f.endsWith('.gguf') || f.endsWith('.ckpt'));
        if (modelFiles.length === 0) {
            return NextResponse.json({ error: 'No models found in ' + modelsDir }, { status: 404 });
        }

        const modelPath = path.join(modelsDir, modelFiles[0]);
        const tmpDir = path.join(localAiDir, 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const outPath = path.join(tmpDir, `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`);
        const seed = Math.floor(Math.random() * 2147483647);

        const args = [
            '-m', modelPath,
            '-p', prompt,
            '--sampling-method', 'euler_a',
            '--steps', String(steps),
            '--cfg-scale', String(guidance),
            '-W', String(width),
            '-H', String(height),
            '-s', String(seed),
            '-o', outPath,
        ];

        if (negativePrompt) {
            args.push('-n', negativePrompt);
        }

        const spawnEnv = { 
            ...process.env, 
            PATH: `${path.join(localAiDir, 'bin')};${process.env.PATH || ''}`,
            DYLD_LIBRARY_PATH: path.join(localAiDir, 'bin'), 
            LD_LIBRARY_PATH: path.join(localAiDir, 'bin') 
        };

        const encoder = new TextEncoder();
        const startTime = Date.now();

        const stream = new ReadableStream({
            start(controller) {
                const sendEvent = (data) => {
                    try {
                        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
                    } catch (e) {}
                };

                sendEvent({ type: 'status', message: 'Loading model tensors into memory...', step: 0, total: steps, percent: 0 });

                const child = spawn(binPath, args, { env: spawnEnv });
                let errOutput = '';
                let lastStep = 0;

                const onData = (d) => {
                    const str = d.toString();
                    errOutput += str;

                    if (str.includes('loading tensors')) {
                        sendEvent({ type: 'status', message: 'Tensors loaded. Starting sampling...', step: 0, total: steps, percent: 5 });
                    } else if (str.includes('decoding') || str.includes('decode_first_stage')) {
                        sendEvent({ type: 'status', message: 'Decoding VAE (Generating final image)...', step: steps, total: steps, percent: 95 });
                    }

                    const progress = parseStep(str);
                    if (progress && progress.step > lastStep) {
                        lastStep = progress.step;
                        const pct = Math.round(5 + (progress.step / progress.total) * 88);
                        sendEvent({
                            type: 'progress',
                            step: progress.step,
                            total: progress.total,
                            speed: progress.speed,
                            percent: pct,
                            message: `Step ${progress.step}/${progress.total} ${progress.speed ? `(${progress.speed})` : ''}`
                        });
                    }
                };

                child.stdout.on('data', onData);
                child.stderr.on('data', onData);

                child.on('close', (code) => {
                    if (code !== 0) {
                        sendEvent({ type: 'error', error: `sd-cli error (code ${code}): ${errOutput.slice(-300)}` });
                        controller.close();
                        return;
                    }

                    if (!fs.existsSync(outPath)) {
                        sendEvent({ type: 'error', error: 'Output image file not found on disk' });
                        controller.close();
                        return;
                    }

                    try {
                        const imgBuffer = fs.readFileSync(outPath);
                        const base64 = `data:image/png;base64,${imgBuffer.toString('base64')}`;
                        fs.unlinkSync(outPath);
                        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

                        sendEvent({
                            type: 'done',
                            url: base64,
                            seed,
                            model: modelFiles[0],
                            duration: `${duration}s`,
                            percent: 100
                        });
                    } catch (err) {
                        sendEvent({ type: 'error', error: err.message });
                    }
                    controller.close();
                });

                child.on('error', (err) => {
                    sendEvent({ type: 'error', error: err.message });
                    controller.close();
                });
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
