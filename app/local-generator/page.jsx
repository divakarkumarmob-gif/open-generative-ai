'use client';
import { useState } from 'react';

const STYLE_PRESETS = [
    {
        id: 'photorealistic',
        name: '📸 Ultra Realistic Photo',
        positiveAdd: 'masterpiece, best quality, ultra-detailed, photorealistic, 8k uhd, dslr, soft natural lighting, sharp focus, 35mm lens, natural skin texture',
        negativeAdd: 'cartoon, drawing, anime, 3d render, illustration, blurry, oversaturated, deformed, bad hands',
        steps: 25,
        guidance: 7.5,
    },
    {
        id: 'glamour',
        name: '🔥 Glamour & Aesthetic',
        positiveAdd: 'masterpiece, highly detailed, gorgeous, alluring, studio lighting, sensual, elegant pose, seductive expression, 8k, highly aesthetic',
        negativeAdd: 'ugly, deformed, disfigured, bad anatomy, lowres, blurry, cartoonish, extra limbs',
        steps: 25,
        guidance: 7.0,
    },
    {
        id: 'cinematic',
        name: '🎬 Cinematic Movie 4K',
        positiveAdd: 'cinematic still, award winning cinematography, dramatic lighting, anamorphic lens, 8k resolution, photorealistic, depth of field, atmospheric',
        negativeAdd: 'amateur, bad framing, low quality, flat lighting, painting, sketch',
        steps: 28,
        guidance: 7.5,
    },
    {
        id: 'anime',
        name: '🌸 Anime Masterpiece',
        positiveAdd: 'masterpiece, best quality, high quality anime aesthetic, vibrant colors, detailed lineart, stunning eyes, trending on pixiv, 4k',
        negativeAdd: 'photorealistic, real life, low quality, sketch, messy lines',
        steps: 22,
        guidance: 8.0,
    },
    {
        id: 'fantasy',
        name: '🧙‍♂️ Fantasy Art',
        positiveAdd: 'epic fantasy art, magical glowing particles, highly detailed, concept art, trending on artstation, unreal engine 5 render, 8k',
        negativeAdd: 'blurry, mundane, modern, lowres, deformed',
        steps: 25,
        guidance: 7.5,
    },
];

const HINGLISH_DICT = {
    'ladki': 'young woman, 1girl',
    'aurat': 'mature woman, elegant female',
    'ladka': 'handsome man, 1boy',
    'sundar': 'gorgeous, beautiful face, soft skin, symmetrical facial features',
    'khoobsurat': 'stunning, ethereal beauty, highly attractive',
    'hot': 'alluring, attractive, seductive pose, perfect physique',
    'sexy': 'sensual, voluptuous, seductive, aesthetic',
    'bina kapde': 'topless, uncensored, nude, bare skin',
    'kam kapde': 'revealing outfit, lingerie, bikini, cleavage',
    'kapde': 'stylish clothing, elegant dress',
    'chehra': 'detailed face, expressive eyes, realistic lips',
    'aankhein': 'detailed sparkling eyes, sharp focus',
    'baal': 'long detailed hair, silky hair strands',
    'body': 'toned body, realistic body proportions, smooth skin',
    'room': 'luxury bedroom, warm ambient interior lighting',
    'beach': 'tropical beach, sunset golden hour, ocean waves background',
    'night': 'nighttime, moonlight, neon reflections',
    'photo': 'raw photo, dslr quality, 8k, professional photography',
};

export default function LocalGeneratorPage() {
    const [engineMode, setEngineMode] = useState('pollinations'); // 'pollinations' or 'local'
    const [polliModel, setPolliModel] = useState('flux');
    
    const [userIdea, setUserIdea] = useState('ek sundar ladki luxury room me');
    const [prompt, setPrompt] = useState('a stunning gorgeous young woman standing in a luxury modern bedroom, soft cinematic ambient lighting, masterpiece, ultra-detailed, 8k uhd, photorealistic');
    const [negativePrompt, setNegativePrompt] = useState('ugly, blurry, deformed hands, extra fingers, bad anatomy, low quality, watermark, cartoon');
    const [selectedStyle, setSelectedStyle] = useState('photorealistic');
    const [autoEnhanceOn, setAutoEnhanceOn] = useState(true);
    
    const [steps, setSteps] = useState(25);
    const [guidance, setGuidance] = useState(7.5);
    const [loading, setLoading] = useState(false);
    const [resultImage, setResultImage] = useState(null);
    const [error, setError] = useState(null);

    // Live progress state
    const [percent, setPercent] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(25);
    const [speedText, setSpeedText] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [timeTaken, setTimeTaken] = useState('');
    const [liveLogs, setLiveLogs] = useState([]);

    const enhancePromptFromIdea = (inputText, styleId = selectedStyle) => {
        let text = inputText.toLowerCase().trim();
        if (!text) return;

        let translated = text;
        for (const [key, replacement] of Object.entries(HINGLISH_DICT)) {
            const regex = new RegExp(`\\b${key}\\b`, 'gi');
            translated = translated.replace(regex, replacement);
        }

        const style = STYLE_PRESETS.find(s => s.id === styleId) || STYLE_PRESETS[0];
        const finalPrompt = `${translated}, ${style.positiveAdd}`;
        const finalNegative = `${negativePrompt ? negativePrompt + ', ' : ''}${style.negativeAdd}`;

        setPrompt(finalPrompt);
        setNegativePrompt(finalNegative);
        setSteps(style.steps);
        setGuidance(style.guidance);
        return finalPrompt;
    };

    const handleStyleChange = (styleId) => {
        setSelectedStyle(styleId);
        enhancePromptFromIdea(userIdea, styleId);
    };

    const handleIdeaChange = (val) => {
        setUserIdea(val);
        if (autoEnhanceOn) {
            enhancePromptFromIdea(val, selectedStyle);
        } else {
            setPrompt(val);
        }
    };

    const handleMagicEnhance = () => {
        enhancePromptFromIdea(userIdea, selectedStyle);
    };

    const addTag = (tag) => {
        setPrompt(prev => prev ? `${prev}, ${tag}` : tag);
    };

    const handleGenerate = async () => {
        const finalPromptToRun = autoEnhanceOn && !prompt.includes('masterpiece') ? enhancePromptFromIdea(userIdea, selectedStyle) : prompt;
        if (!finalPromptToRun || loading) return;

        setLoading(true);
        setError(null);
        setPercent(0);
        setCurrentStep(0);
        setTotalSteps(steps);
        setSpeedText('');
        setTimeTaken('');
        setStatusMessage(engineMode === 'pollinations' ? 'Sending to Pollinations Free Cloud GPU...' : 'Starting local sd.cpp engine...');
        setLiveLogs([`[Init] Mode: ${engineMode === 'pollinations' ? 'Pollinations (Cloud Zero-Key)' : 'Local Hardware'}`]);

        try {
            const response = await fetch('/api/local/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: finalPromptToRun,
                    negativePrompt,
                    steps: Number(steps),
                    guidance: Number(guidance),
                    width: 512,
                    height: 512,
                    provider: engineMode,
                    model: polliModel,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server error');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);

                        if (data.type === 'status') {
                            setStatusMessage(data.message);
                            if (data.percent !== undefined) setPercent(data.percent);
                            setLiveLogs(prev => [...prev.slice(-8), `[Status] ${data.message}`]);
                        } else if (data.type === 'progress') {
                            setCurrentStep(data.step);
                            setTotalSteps(data.total);
                            setSpeedText(data.speed || '');
                            setPercent(data.percent);
                            setStatusMessage(data.message);
                            setLiveLogs(prev => [...prev.slice(-8), `[Step ${data.step}/${data.total}] ${data.speed || ''}`]);
                        } else if (data.type === 'done') {
                            setResultImage(data.url);
                            setPercent(100);
                            setTimeTaken(data.duration);
                            setStatusMessage(`✅ Done in ${data.duration}! (${data.model})`);
                            setLiveLogs(prev => [...prev.slice(-8), `[Finished] Image generated in ${data.duration}`]);
                        } else if (data.type === 'error') {
                            throw new Error(data.error);
                        }
                    } catch (e) {
                        if (e.message && !e.message.includes('JSON')) throw e;
                    }
                }
            }
        } catch (err) {
            setError(err.message);
            setStatusMessage('');
            setLiveLogs(prev => [...prev, `[Error] ${err.message}`]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#070b14', color: '#f8fafc', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ maxWidth: '1050px', margin: '0 auto', background: '#0f172a', borderRadius: '20px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', border: '1px solid #1e293b' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(90deg, #38bdf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                            ⚡ Smart AI Image Studio
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                            Pollinations (Free Instant Cloud) + 100% Offline Local Engine
                        </p>
                    </div>

                    {/* Engine Mode Selector */}
                    <div style={{ display: 'flex', backgroundColor: '#090d16', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
                        <button
                            onClick={() => setEngineMode('pollinations')}
                            style={{
                                backgroundColor: engineMode === 'pollinations' ? '#2563eb' : 'transparent',
                                color: engineMode === 'pollinations' ? '#ffffff' : '#94a3b8',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            ⚡ Pollinations (Fast 5s Free Cloud)
                        </button>
                        <button
                            onClick={() => setEngineMode('local')}
                            style={{
                                backgroundColor: engineMode === 'local' ? '#7c3aed' : 'transparent',
                                color: engineMode === 'local' ? '#ffffff' : '#94a3b8',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            💻 Offline Local GPU (sd.cpp)
                        </button>
                    </div>
                </div>

                {/* Pollinations Model Bar */}
                {engineMode === 'pollinations' && (
                    <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#131d36', padding: '10px 14px', borderRadius: '10px', border: '1px solid #1d4ed8' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#60a5fa' }}>🌟 Cloud Model:</span>
                        {[
                            { id: 'flux', label: 'Flux (Best Quality)' },
                            { id: 'turbo', label: 'SDXL Turbo (Ultra Fast)' },
                            { id: 'any-dark', label: 'Dark Aesthetic' }
                        ].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setPolliModel(m.id)}
                                style={{
                                    backgroundColor: polliModel === m.id ? '#3b82f6' : '#1e293b',
                                    color: polliModel === m.id ? '#ffffff' : '#cbd5e1',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* 1-Click Style Presets */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🎨 Step 1: Style Choose Karein:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {STYLE_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => handleStyleChange(preset.id)}
                                style={{
                                    backgroundColor: selectedStyle === preset.id ? '#2563eb' : '#1e293b',
                                    color: selectedStyle === preset.id ? '#ffffff' : '#cbd5e1',
                                    border: selectedStyle === preset.id ? '1px solid #60a5fa' : '1px solid #334155',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '24px' }}>
                    {/* Left Column */}
                    <div>
                        {/* Simple Idea Box */}
                        <div style={{ marginBottom: '16px', backgroundColor: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8' }}>
                                    ✍️ Step 2: Apna Simple Idea Likhein (Hinglish/English):
                                </label>
                                <button
                                    onClick={handleMagicEnhance}
                                    style={{ background: 'linear-gradient(90deg, #9333ea, #ec4899)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ✨ Magic Auto-Enhance
                                </button>
                            </div>
                            <textarea
                                value={userIdea}
                                onChange={(e) => handleIdeaChange(e.target.value)}
                                rows={2}
                                style={{ width: '100%', backgroundColor: '#131b2e', border: '1px solid #475569', borderRadius: '8px', padding: '10px', color: '#f8fafc', fontSize: '14px', boxSizing: 'border-box' }}
                                placeholder="Jaise: ek sundar ladki room me khadi hai..."
                            />

                            {/* Quick 1-Click Modifier Tags */}
                            <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Quick Add:</span>
                                {['Sensual Lighting', 'Close-up Face', 'Full Body Shot', 'Sunset Beach', 'Luxury Bedroom', 'Rainy Night', 'Uncensored'].map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => addTag(tag)}
                                        style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                                    >
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Generated AI Professional Prompt */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                                <span>🤖 Final Enhanced Prompt:</span>
                                <span style={{ color: '#34d399', fontSize: '11px' }}>Auto-Tuned Quality</span>
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={3}
                                style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px', color: '#cbd5e1', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Negative Prompt */}
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                                🚫 Negative Prompt:
                            </label>
                            <textarea
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                rows={2}
                                style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px', color: '#64748b', fontSize: '11px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            style={{
                                width: '100%',
                                background: loading ? '#334155' : engineMode === 'pollinations' ? 'linear-gradient(90deg, #2563eb, #3b82f6)' : 'linear-gradient(90deg, #7c3aed, #9333ea)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '14px',
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 10px 20px -5px rgba(37, 99, 235, 0.5)',
                            }}
                        >
                            {loading ? `⏳ Generating... (${percent}%)` : engineMode === 'pollinations' ? '🚀 Generate on Cloud (Fast 5s)' : '💻 Generate on Local GPU'}
                        </button>

                        {/* LIVE PROGRESS SECTION */}
                        {loading && (
                            <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#090d16', borderRadius: '10px', border: '1px solid #38bdf8' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8' }}>
                                        {statusMessage || 'Processing...'}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                                        {percent}%
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '9999px', overflow: 'hidden', marginBottom: '8px' }}>
                                    <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #a855f7)', borderRadius: '9999px', transition: 'width 0.3s ease-in-out' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                                    <span>{speedText ? `⚡ ${speedText}` : ''}</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{ marginTop: '14px', padding: '10px', backgroundColor: '#450a0a', border: '1px solid #991b1b', borderRadius: '8px', color: '#fecaca', fontSize: '12px' }}>
                                ⚠️ {error}
                            </div>
                        )}
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', borderRadius: '16px', border: '2px dashed #1e293b', minHeight: '450px', padding: '18px' }}>
                        {resultImage ? (
                            <div style={{ width: '100%', textAlign: 'center' }}>
                                <img
                                    src={resultImage}
                                    alt="Generated Result"
                                    style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.8)', border: '1px solid #334155' }}
                                />
                                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                                    <a
                                        href={resultImage}
                                        download={`image-${Date.now()}.png`}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', color: '#ffffff', padding: '9px 18px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}
                                    >
                                        ⬇️ Download PNG
                                    </a>
                                    {timeTaken && (
                                        <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#1e293b', padding: '6px 10px', borderRadius: '6px' }}>
                                            ⏱️ {timeTaken}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#475569' }}>
                                {loading ? (
                                    <div>
                                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚙️</div>
                                        <p style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '600', margin: 0 }}>Rendering Image...</p>
                                        <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>{statusMessage}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>🖼️</span>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>Image Yahan Dikhayi Degi</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>Pollinations (Fast) ya Local select karke Generate dabayein</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
