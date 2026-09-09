'use client';
import { useState } from 'react';

const STYLE_PRESETS = [
    {
        id: 'photorealistic',
        name: '📸 Real Life Photography (DSLR)',
        positiveAdd: 'award winning portrait photography, shot on Hasselblad 100mm f/1.8, 8k resolution, natural lighting, crystal clear focus, realistic skin texture, beautiful face, photorealistic',
        negativeAdd: 'drawing, cartoon, 3d, illustration, blurry, deformed, bad anatomy, low quality',
    },
    {
        id: 'glamour',
        name: '🔥 Glamour & Fashion',
        positiveAdd: 'high fashion studio portrait, gorgeous aesthetic, elegant pose, studio lighting, flawless natural skin, highly detailed, 8k, sharp focus',
        negativeAdd: 'ugly, deformed, disfigured, bad anatomy, lowres, blurry, cartoonish',
    },
    {
        id: 'cinematic',
        name: '🎬 Cinematic 4K Film',
        positiveAdd: 'cinematic movie still, 35mm film photography, atmospheric lighting, depth of field, sharp face and eyes, 8k resolution',
        negativeAdd: 'amateur, bad framing, low quality, flat lighting, painting',
    },
];

const SHOT_TYPES = [
    {
        id: 'full_body',
        name: '🧍 Full Body (Head to Toe)',
        positive: 'full length photograph showing entire body from head to feet standing, wide camera angle, feet and floor visible',
        negative: 'close-up, cropped, out of frame, cut off feet, cut off head',
    },
    {
        id: 'medium_shot',
        name: '💃 Medium Shot (Waist Up)',
        positive: 'medium shot from waist up, stylish pose, clear view of upper body and detailed face',
        negative: 'extreme close up, full body, cut off face',
    },
    {
        id: 'close_up',
        name: '📸 Close-up Face',
        positive: 'close up portrait focusing on face, extremely detailed sparkling eyes and natural smile',
        negative: 'full body, distant shot, wide angle',
    },
];

const HINGLISH_DICT = {
    'ladki': 'beautiful young woman',
    'aurat': 'elegant woman',
    'ladka': 'handsome man',
    'sundar': 'gorgeous, beautiful face, soft natural skin',
    'khoobsurat': 'stunning, highly attractive',
    'hot': 'alluring, attractive, aesthetic pose',
    'sexy': 'sensual, voluptuous, seductive, aesthetic',
    'bina kapde': 'topless, uncensored, nude, bare skin',
    'kam kapde': 'revealing outfit, lingerie, bikini',
    'kapde': 'stylish elegant dress',
    'chehra': 'detailed face, expressive eyes, realistic lips',
    'aankhein': 'sharp clear eyes, realistic reflections',
    'baal': 'long silky hair',
    'body': 'toned body, realistic natural proportions',
    'room': 'luxury modern bedroom with ambient lighting',
    'beach': 'tropical beach during golden hour sunset',
    'night': 'nighttime with warm atmospheric lighting',
    'photo': 'real photograph, 8k uhd, dslr quality',
    'poori body': 'full body photograph head to toe',
    'full body': 'full body photograph head to toe',
};

export default function LocalGeneratorPage() {
    const [engineMode, setEngineMode] = useState('pollinations');
    const [polliModel, setPolliModel] = useState('flux');
    
    const [selectedShot, setSelectedShot] = useState('full_body');
    const [resolution, setResolution] = useState('768x1024');

    const [userIdea, setUserIdea] = useState('ek sundar ladki poori body luxury bedroom me');
    const [prompt, setPrompt] = useState('A full length photograph of a beautiful young woman standing in a luxury modern bedroom with ambient lighting, award winning portrait photography, shot on Hasselblad 100mm f/1.8, 8k resolution, natural lighting, crystal clear focus, realistic skin texture, beautiful face, photorealistic');
    const [negativePrompt, setNegativePrompt] = useState('close-up, cropped, out of frame, cut off feet, cut off head, drawing, cartoon, 3d, illustration, blurry, deformed, bad anatomy, low quality');
    const [selectedStyle, setSelectedStyle] = useState('photorealistic');
    const [autoEnhanceOn, setAutoEnhanceOn] = useState(true);
    
    const [loading, setLoading] = useState(false);
    const [resultImage, setResultImage] = useState(null);
    const [error, setError] = useState(null);

    const [percent, setPercent] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [timeTaken, setTimeTaken] = useState('');

    const enhancePromptFromIdea = (inputText, styleId = selectedStyle, shotId = selectedShot) => {
        let text = inputText.toLowerCase().trim();
        if (!text) return;

        let translated = text;
        for (const [key, replacement] of Object.entries(HINGLISH_DICT)) {
            const regex = new RegExp(`\\b${key}\\b`, 'gi');
            translated = translated.replace(regex, replacement);
        }

        const style = STYLE_PRESETS.find(s => s.id === styleId) || STYLE_PRESETS[0];
        const shot = SHOT_TYPES.find(s => s.id === shotId) || SHOT_TYPES[0];

        // Clean natural sentence structure
        const finalPrompt = `A ${shot.positive} of a ${translated}, ${style.positiveAdd}`;
        const finalNegative = `${shot.negative}, ${style.negativeAdd}`;

        setPrompt(finalPrompt);
        setNegativePrompt(finalNegative);
        return finalPrompt;
    };

    const handleStyleChange = (styleId) => {
        setSelectedStyle(styleId);
        enhancePromptFromIdea(userIdea, styleId, selectedShot);
    };

    const handleShotChange = (shotId) => {
        setSelectedShot(shotId);
        enhancePromptFromIdea(userIdea, selectedStyle, shotId);
    };

    const handleIdeaChange = (val) => {
        setUserIdea(val);
        if (autoEnhanceOn) {
            enhancePromptFromIdea(val, selectedStyle, selectedShot);
        } else {
            setPrompt(val);
        }
    };

    const handleMagicEnhance = () => {
        enhancePromptFromIdea(userIdea, selectedStyle, selectedShot);
    };

    const addTag = (tag) => {
        setPrompt(prev => prev ? `${prev}, ${tag}` : tag);
    };

    const handleGenerate = async () => {
        const finalPromptToRun = autoEnhanceOn ? enhancePromptFromIdea(userIdea, selectedStyle, selectedShot) : prompt;
        if (!finalPromptToRun || loading) return;

        setLoading(true);
        setError(null);
        setPercent(0);
        setTimeTaken('');
        setStatusMessage('Generating 8K Ultra-Realism Image with Flux Engine...');

        const [w, h] = resolution.split('x').map(Number);

        try {
            const response = await fetch('/api/local/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: finalPromptToRun,
                    negativePrompt,
                    width: w,
                    height: h,
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
                        } else if (data.type === 'done') {
                            setResultImage(data.url);
                            setPercent(100);
                            setTimeTaken(data.duration);
                            setStatusMessage(`✅ Ultra-Realistic Image Ready in ${data.duration}!`);
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#070b14', color: '#f8fafc', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', background: '#0f172a', borderRadius: '20px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', border: '1px solid #1e293b' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(90deg, #38bdf8, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                            ⚡ Ultra Realism Studio (Natural Face & Body)
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                            Flux Photorealism • True Skin Texture & Sharp Eyes • Full Body Head-to-Toe
                        </p>
                    </div>

                    {/* Mode Selector */}
                    <div style={{ display: 'flex', backgroundColor: '#090d16', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
                        <button
                            onClick={() => { setEngineMode('pollinations'); setPolliModel('flux'); }}
                            style={{
                                backgroundColor: engineMode === 'pollinations' ? '#2563eb' : 'transparent',
                                color: engineMode === 'pollinations' ? '#ffffff' : '#94a3b8',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                            }}
                        >
                            ⚡ Flux Ultra 8K (Recommended)
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
                            }}
                        >
                            💻 Offline Local GPU
                        </button>
                    </div>
                </div>

                {/* Shot Framing Bar */}
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', backgroundColor: '#1e1b4b', padding: '10px 16px', borderRadius: '12px', border: '1px solid #4338ca', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#a5b4fc' }}>📷 Camera Angle:</span>
                    {SHOT_TYPES.map((st) => (
                        <button
                            key={st.id}
                            onClick={() => handleShotChange(st.id)}
                            style={{
                                backgroundColor: selectedShot === st.id ? '#6366f1' : '#0f172a',
                                color: selectedShot === st.id ? '#ffffff' : '#cbd5e1',
                                border: selectedShot === st.id ? '1px solid #a5b4fc' : '1px solid #312e81',
                                padding: '7px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                            }}
                        >
                            {st.name}
                        </button>
                    ))}
                </div>

                {/* Resolution Bar */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', backgroundColor: '#131e36', padding: '12px 16px', borderRadius: '12px', border: '1px solid #1e3a8a', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#93c5fd' }}>📐 Resolution:</span>
                    {[
                        { id: '768x1024', label: '📱 768x1024 (HD Full Body)' },
                        { id: '1024x1024', label: '🖼️ 1024x1024 (Ultra Square)' },
                        { id: '1024x768', label: '🎬 1024x768 (Landscape)' }
                    ].map((res) => (
                        <button
                            key={res.id}
                            onClick={() => setResolution(res.id)}
                            style={{
                                backgroundColor: resolution === res.id ? '#3b82f6' : '#1e293b',
                                color: resolution === res.id ? '#ffffff' : '#cbd5e1',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                            }}
                        >
                            {res.label}
                        </button>
                    ))}
                </div>

                {/* 1-Click Style Presets */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🎨 Style Presets:
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
                                    ✍️ Apna Idea Likhein (Hinglish/English):
                                </label>
                                <button
                                    onClick={handleMagicEnhance}
                                    style={{ background: 'linear-gradient(90deg, #9333ea, #ec4899)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ✨ Auto-Enhance
                                </button>
                            </div>
                            <textarea
                                value={userIdea}
                                onChange={(e) => handleIdeaChange(e.target.value)}
                                rows={2}
                                style={{ width: '100%', backgroundColor: '#131b2e', border: '1px solid #475569', borderRadius: '8px', padding: '10px', color: '#f8fafc', fontSize: '14px', boxSizing: 'border-box' }}
                                placeholder="Jaise: ek sundar ladki poori body luxury bedroom me..."
                            />

                            {/* Quick 1-Click Modifier Tags */}
                            <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Quick Add:</span>
                                {['Sharp Natural Eyes', 'Natural Skin Pores', 'Head to Toe View', 'Standing Pose', 'Studio Lighting', 'Uncensored'].map((tag) => (
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

                        {/* Generated AI Prompt */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                                <span>🤖 Final Clean Prompt (Midjourney / Flux Style):</span>
                                <span style={{ color: '#34d399', fontSize: '11px' }}>Natural Photorealistic Style</span>
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={3}
                                style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px', color: '#cbd5e1', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            style={{
                                width: '100%',
                                background: loading ? '#334155' : 'linear-gradient(90deg, #2563eb, #7c3aed)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '15px',
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 10px 20px -5px rgba(37, 99, 235, 0.5)',
                            }}
                        >
                            {loading ? `⏳ Rendering Ultra Realism (${percent}%)` : '🚀 Generate Ultra Realistic Image'}
                        </button>

                        {/* Live Progress */}
                        {loading && (
                            <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#090d16', borderRadius: '10px', border: '1px solid #38bdf8' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8' }}>
                                        {statusMessage || 'Rendering...'}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
                                        {percent}%
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                                    <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #10b981)', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', borderRadius: '16px', border: '2px dashed #1e293b', minHeight: '480px', padding: '18px' }}>
                        {resultImage ? (
                            <div style={{ width: '100%', textAlign: 'center' }}>
                                <img
                                    src={resultImage}
                                    alt="Generated Result"
                                    style={{ maxWidth: '100%', maxHeight: '460px', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.8)', border: '1px solid #334155' }}
                                />
                                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                                    <a
                                        href={resultImage}
                                        download={`ultra-realism-${Date.now()}.png`}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', color: '#ffffff', padding: '9px 18px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}
                                    >
                                        ⬇️ Download Full Resolution PNG
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
                                        <p style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '600', margin: 0 }}>Rendering Natural Skin & Lighting...</p>
                                        <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>Flux Photorealism Active</p>
                                    </div>
                                ) : (
                                    <div>
                                        <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>📸</span>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>Photorealistic Image Yahan Dikhayi Degi</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>Idea likhein aur Generate dabayein</p>
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
