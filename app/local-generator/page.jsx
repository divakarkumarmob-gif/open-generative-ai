'use client';
import { useState } from 'react';

const STYLE_PRESETS = [
    {
        id: 'photorealistic',
        name: '📸 Ultra Realistic DSLR 8K',
        positiveAdd: 'masterpiece, best quality, ultra-detailed, highly realistic photography, 8k uhd, dslr, 50mm lens, sharp focus, (detailed beautiful symmetrical face, sharp clear sparkling eyes, natural realistic lips:1.3), (natural skin texture, visible subtle skin pores:1.2), soft studio lighting, high resolution',
        negativeAdd: 'cartoon, drawing, anime, 3d render, illustration, blurry face, distorted eyes, bad pupils, deformed face, melting face, plastic skin, airbrushed, oversaturated, deformed hands, extra limbs, duplicate, low quality',
        steps: 30,
        guidance: 7.5,
    },
    {
        id: 'glamour',
        name: '🔥 Glamour & Photorealistic Art',
        positiveAdd: 'masterpiece, highly detailed, gorgeous, alluring, studio lighting, sensual, elegant pose, seductive expression, (flawless detailed facial features, expressive sharp eyes:1.3), realistic female body anatomy, 8k, highly aesthetic',
        negativeAdd: 'ugly, deformed, disfigured, bad anatomy, blurry face, distorted face, lowres, blurry, cartoonish, extra limbs, extra hands, fused fingers, malformed, plastic',
        steps: 30,
        guidance: 7.0,
    },
    {
        id: 'cinematic',
        name: '🎬 4K Cinematic Shot',
        positiveAdd: 'cinematic still, award winning cinematography, dramatic lighting, anamorphic lens, 8k resolution, photorealistic, (detailed expressive sharp face:1.3), depth of field, atmospheric, sharp details',
        negativeAdd: 'amateur, bad framing, low quality, flat lighting, painting, sketch, deformed body, blurry face',
        steps: 30,
        guidance: 7.5,
    },
];

const SHOT_TYPES = [
    {
        id: 'full_body',
        name: '🧍 Full Body (Head to Toe)',
        positive: 'full body shot, complete head to toe view, standing pose, full length portrait, entire body visible from head to feet, (sharp detailed face:1.2), high definition, wide shot, pulled back camera angle, stylish shoes visible, floor visible',
        negative: 'close-up, cropped, zoomed in, headshot, bust shot, out of frame, cut off head, cut off legs, cropped feet, torso only',
    },
    {
        id: 'medium_shot',
        name: '💃 Medium Shot (Waist Up)',
        positive: 'medium shot, waist up portrait, upper body shot, stylish pose, clear sharp view of outfit and (detailed face, sharp eyes:1.3)',
        negative: 'extreme close up, full body, cut off face, blurry',
    },
    {
        id: 'close_up',
        name: '📸 Close-up (Face Portrait)',
        positive: 'close-up portrait, (extremely detailed face, sharp detailed eyes, natural skin pores, realistic lips:1.4), studio portrait lighting',
        negative: 'full body, distant shot, wide angle, cropped face, blurry eyes',
    },
];

const HINGLISH_DICT = {
    'ladki': 'young woman, 1girl',
    'aurat': 'mature woman, elegant female',
    'ladka': 'handsome man, 1boy',
    'sundar': 'gorgeous, beautiful face, soft skin, symmetrical facial features, highly detailed face',
    'khoobsurat': 'stunning, ethereal beauty, highly attractive, perfect symmetry',
    'hot': 'alluring, attractive, seductive pose, perfect physique, toned body',
    'sexy': 'sensual, voluptuous, seductive, aesthetic, flawless skin',
    'bina kapde': 'topless, uncensored, nude, bare skin',
    'kam kapde': 'revealing outfit, lingerie, bikini, cleavage',
    'kapde': 'stylish clothing, elegant dress',
    'chehra': '(detailed sharp face, realistic lips, natural skin:1.3)',
    'aankhein': '(sharp sparkling eyes, realistic pupils, high focus:1.3)',
    'baal': 'long detailed silky hair, strand by strand detail',
    'body': 'perfect female body anatomy, toned body, realistic proportions, smooth natural skin',
    'room': 'luxury bedroom, warm ambient interior lighting, rich interior decor',
    'beach': 'tropical beach, sunset golden hour, crystal clear ocean waves',
    'night': 'nighttime, moonlight, neon city reflections',
    'photo': 'raw photograph, dslr quality, 8k uhd, professional photography, hyperrealistic',
    'poori body': 'full body shot, entire body head to toe, feet visible',
    'full body': 'full body shot, entire body head to toe, feet visible',
};

const ANATOMY_POSITIVE = '(perfect human anatomy, correct body proportions, exactly two arms, exactly two legs:1.2), (perfect detailed hands, accurate 5 fingers per hand:1.2), (crystal clear sharp detailed face, realistic eyes:1.3), natural skin pores, 8k uhd, sharp focus';
const ANATOMY_NEGATIVE = 'blurry face, distorted face, deformed eyes, melting face, plastic skin, doll face, bad pupils, extra hands, extra arms, four hands, multiple arms, extra legs, mutated hands, poorly drawn hands, malformed limbs, missing fingers, extra fingers, fused fingers, cloned body, duplicate person, bad anatomy, deformed body, disfigured, blurry, low resolution, pixelated';

export default function LocalGeneratorPage() {
    const [engineMode, setEngineMode] = useState('pollinations');
    const [polliModel, setPolliModel] = useState('flux');
    
    const [selectedShot, setSelectedShot] = useState('full_body');
    const [resolution, setResolution] = useState('768x1024');
    const [fixAnatomy, setFixAnatomy] = useState(true);

    const [userIdea, setUserIdea] = useState('ek sundar ladki poori body luxury bedroom me');
    const [prompt, setPrompt] = useState('full body shot, complete head to toe view, standing pose, full length portrait, entire body visible, a stunning gorgeous young woman standing in a luxury modern bedroom, soft cinematic ambient lighting, (detailed beautiful face, sharp clear eyes:1.3), masterpiece, ultra-detailed, 8k uhd, photorealistic, perfect human anatomy, detailed hands');
    const [negativePrompt, setNegativePrompt] = useState(`close-up, cropped, zoomed in, headshot, bust shot, out of frame, cut off head, cut off legs, cropped feet, torso only, ${ANATOMY_NEGATIVE}`);
    const [selectedStyle, setSelectedStyle] = useState('photorealistic');
    const [autoEnhanceOn, setAutoEnhanceOn] = useState(true);
    
    const [steps, setSteps] = useState(30);
    const [guidance, setGuidance] = useState(7.5);
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
        const anatomyText = fixAnatomy ? `, ${ANATOMY_POSITIVE}` : '';

        const finalPrompt = `${shot.positive}, ${translated}, ${style.positiveAdd}${anatomyText}`;
        const finalNegative = `${shot.negative}, ${style.negativeAdd}, ${ANATOMY_NEGATIVE}`;

        setPrompt(finalPrompt);
        setNegativePrompt(finalNegative);
        setSteps(style.steps);
        setGuidance(style.guidance);
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
        const finalPromptToRun = autoEnhanceOn && !prompt.includes('masterpiece') ? enhancePromptFromIdea(userIdea, selectedStyle, selectedShot) : prompt;
        if (!finalPromptToRun || loading) return;

        setLoading(true);
        setError(null);
        setPercent(0);
        setTimeTaken('');
        setStatusMessage('Rendering with High-Resolution Face & Body Sharpening...');

        const [w, h] = resolution.split('x').map(Number);

        try {
            const response = await fetch('/api/local/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: finalPromptToRun,
                    negativePrompt,
                    steps: Number(steps),
                    guidance: Number(guidance),
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
                        } else if (data.type === 'progress') {
                            setPercent(data.percent);
                            setStatusMessage(`Sampling Step ${data.step}/${data.total}`);
                        } else if (data.type === 'done') {
                            setResultImage(data.url);
                            setPercent(100);
                            setTimeTaken(data.duration);
                            setStatusMessage(`✅ High-Definition Realism Complete in ${data.duration}!`);
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
                            ⚡ Ultra Realism Studio (Sharp Face & Full Body)
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                            Crystal Clear Facial Features • Natural Skin • Perfect Head-to-Toe View
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
                            ⚡ Flux Realism Engine (Ultra Sharp Face)
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
                            💻 Offline Local GPU (sd.cpp)
                        </button>
                    </div>
                </div>

                {/* Shot Framing Bar */}
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', backgroundColor: '#1e1b4b', padding: '10px 16px', borderRadius: '12px', border: '1px solid #4338ca', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#a5b4fc' }}>📷 Camera Shot:</span>
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

                {/* Resolution & Face Guard Bar */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#131e36', padding: '12px 16px', borderRadius: '12px', border: '1px solid #1e3a8a', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#93c5fd' }}>📐 Resolution:</span>
                        {[
                            { id: '768x1024', label: '📱 768x1024 (HD Full Body)' },
                            { id: '1024x1024', label: '🖼️ 1024x1024 (Ultra 1K)' },
                            { id: '1024x768', label: '🎬 1024x768 (Wide)' }
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => {
                                const nextVal = !fixAnatomy;
                                setFixAnatomy(nextVal);
                                if (nextVal) {
                                    setPrompt(prev => prev.includes('perfect human anatomy') ? prev : `${prev}, ${ANATOMY_POSITIVE}`);
                                    setNegativePrompt(prev => prev.includes('extra hands') ? prev : `${prev}, ${ANATOMY_NEGATIVE}`);
                                }
                            }}
                            style={{
                                backgroundColor: fixAnatomy ? '#065f46' : '#334155',
                                border: fixAnatomy ? '1px solid #10b981' : '1px solid #64748b',
                                color: fixAnatomy ? '#6ee7b7' : '#94a3b8',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                            }}
                        >
                            👁️ Sharp Face & Hand Guard: {fixAnatomy ? 'ACTIVE ✅' : 'OFF ❌'}
                        </button>
                    </div>
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
                                    ✨ Auto-Sharpen Details
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
                                {['Sharp Detailed Eyes', 'Realistic Skin Pores', 'Head to Toe View', 'Standing Pose', 'Studio Lighting', 'Uncensored'].map((tag) => (
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
                                <span>🤖 Final High-Detail Prompt:</span>
                                <span style={{ color: '#34d399', fontSize: '11px' }}>Includes Face & Texture Weights</span>
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
                                🚫 Negative Prompt (Blur & Distortion Blocking):
                            </label>
                            <textarea
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                rows={2}
                                style={{ width: '100%', backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '10px', color: '#f87171', fontSize: '11px', fontFamily: 'monospace', boxSizing: 'border-box' }}
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
                            {loading ? `⏳ Rendering Ultra Sharp Image (${percent}%)` : '🚀 Generate Ultra Sharp Image'}
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
                                        download={`sharp-realism-${Date.now()}.png`}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', color: '#ffffff', padding: '9px 18px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}
                                    >
                                        ⬇️ Download Ultra HD PNG
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
                                        <p style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '600', margin: 0 }}>Rendering Facial Details & Pores...</p>
                                        <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>Sharp Realism Guard Active</p>
                                    </div>
                                ) : (
                                    <div>
                                        <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>💎</span>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>Ultra Sharp Realism</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>Flux Realism Engine + Face & Eye Sharpening Active</p>
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
