document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let isEscalated = false;
    let callDurationSec = 0;
    
    // --- DOM Elements ---
    const primaryEmotionEl = document.getElementById('primary-emotion');
    const emotionDescEl = document.getElementById('emotion-desc');
    const primaryConfidenceEl = document.getElementById('primary-confidence');
    const alertCardEl = document.getElementById('alert-card');
    const riskBadgeEl = document.getElementById('risk-badge');
    const btnToggleDemo = document.getElementById('btn-toggle-demo');
    const btnEscalate = document.getElementById('btn-escalate');
    const globalAlert = document.getElementById('global-alert');
    const pulseIndicator = document.querySelector('.pulse-indicator');
    const durationEl = document.getElementById('call-duration');

    // Progress Bars & Values
    const bars = {
        stressed: document.getElementById('bar-stressed'),
        pain: document.getElementById('bar-pain'),
        abusive: document.getElementById('bar-abusive'),
        drunk: document.getElementById('bar-drunk'),
        neutral: document.getElementById('bar-neutral')
    };
    const vals = {
        stressed: document.getElementById('val-stressed'),
        pain: document.getElementById('val-pain'),
        abusive: document.getElementById('val-abusive'),
        drunk: document.getElementById('val-drunk'),
        neutral: document.getElementById('val-neutral')
    };

    // --- Chart.js Setup ---
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    
    // Gradient for chart
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    const chartConfig = {
        type: 'line',
        data: {
            labels: Array.from({length: 20}, (_, i) => `${20-i}s ago`).reverse(),
            datasets: [{
                label: 'Stress / Risk Level',
                data: Array(20).fill(5), // Start low risk
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 400,
                easing: 'linear'
            },
            scales: {
                y: {
                    min: 0, max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a0aab2' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#a0aab2', maxTicksLimit: 5 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    };
    const timelineChart = new Chart(ctx, chartConfig);

    // --- Modality Confidence UI Elements ---
    const voiceConfEl = document.getElementById('voice-conf');
    const textConfEl = document.getElementById('text-conf');
    const barVoiceEl = document.getElementById('bar-voice');
    const barTextEl = document.getElementById('bar-text');
    const overallConfEl = document.getElementById('overall-conf');

    // --- Mock Data Generator ---
    function formatTime(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    setInterval(() => {
        callDurationSec++;
        durationEl.textContent = formatTime(callDurationSec);
        
        // Generate new probabilities
        let data = {
            neutral: Math.random() * 20 + 80, // mostly neutral
            stressed: Math.random() * 10,
            pain: Math.random() * 5,
            abusive: Math.random() * 5,
            drunk: Math.random() * 5
        };

        if (isEscalated) {
            // Overwrite with High Risk scenario
            data = {
                neutral: Math.random() * 10,
                stressed: Math.random() * 40 + 40,
                abusive: Math.random() * 60 + 30,
                pain: Math.random() * 20,
                drunk: Math.random() * 10
            };
        }

        // Normalize to 100%
        const total = Object.values(data).reduce((a,b)=>a+b,0);
        Object.keys(data).forEach(k => {
            data[k] = (data[k] / total) * 100;
        });

        // Determine primary
        let primaryKey = 'neutral';
        let maxVal = data.neutral;
        for (const [key, val] of Object.entries(data)) {
            if (val > maxVal) {
                maxVal = val;
                primaryKey = key;
            }
        }

        // Update UI Text & Progress
        for (const [key, val] of Object.entries(data)) {
            const pct = Math.round(val);
            bars[key].style.width = `${pct}%`;
            vals[key].textContent = `${pct}%`;
        }

        // Update Primary Card
        const emotionMap = {
            neutral: { title: 'Neutral', text: 'Caller maintaining baseline vocal patterns.', color: 'var(--color-neutral)', risk: 'Normal' },
            stressed: { title: 'Stressed', text: 'Elevated pitch and tempo detected.', color: 'var(--color-stressed)', risk: 'Warning' },
            abusive: { title: 'Abusive', text: 'Aggressive tone and keywords detected.', color: 'var(--color-abusive)', risk: 'Critical' },
            pain: { title: 'In Pain', text: 'Vocal distress markers indicating physical pain.', color: 'var(--color-pain)', risk: 'High Risk' },
            drunk: { title: 'Intoxicated', text: 'Slurred speech and irregular patterns.', color: 'var(--color-drunk)', risk: 'Elevated' }
        };

        const info = emotionMap[primaryKey];
        primaryEmotionEl.textContent = info.title;
        primaryEmotionEl.style.color = info.color;
        emotionDescEl.textContent = info.text;
        primaryConfidenceEl.textContent = `${Math.round(maxVal)}%`;
        
        riskBadgeEl.textContent = info.risk;
        riskBadgeEl.style.color = info.color;
        riskBadgeEl.style.borderColor = info.color;
        riskBadgeEl.style.background = `rgba(0,0,0,0.3)`; // simple translucent

        // Update Modality Metrics (Voice, Text, Overall)
        let voiceConf = Math.random() * 20 + 75; // 75-95 baseline
        let textConf = Math.random() * 20 + 70;  // 70-90 baseline
        
        if (isEscalated) {
            voiceConf = Math.random() * 15 + 85; // High confidence in risk
            textConf = Math.random() * 10 + 90;
        }
        
        let overallConf = (voiceConf * 0.4) + (textConf * 0.6); // Slightly bias towards text/keywords
        
        // Ensure bounded 0-100
        voiceConf = Math.max(0, Math.min(100, voiceConf));
        textConf = Math.max(0, Math.min(100, textConf));
        overallConf = Math.max(0, Math.min(100, overallConf));

        voiceConfEl.textContent = `${Math.round(voiceConf)}%`;
        barVoiceEl.style.width = `${Math.round(voiceConf)}%`;
        barVoiceEl.style.background = info.color;
        barVoiceEl.style.boxShadow = `0 0 8px ${info.color}`;

        textConfEl.textContent = `${Math.round(textConf)}%`;
        barTextEl.style.width = `${Math.round(textConf)}%`;
        barTextEl.style.background = info.color;
        barTextEl.style.boxShadow = `0 0 8px ${info.color}`;

        overallConfEl.textContent = `${Math.round(overallConf)}%`;
        overallConfEl.style.color = info.color;

        // Update Chart
        const riskScore = isEscalated ? (Math.random() * 30 + 70) : (Math.random() * 15);
        timelineChart.data.datasets[0].data.shift();
        timelineChart.data.datasets[0].data.push(riskScore);
        
        // Change chart color based on risk
        timelineChart.data.datasets[0].borderColor = isEscalated ? '#ef4444' : '#3b82f6';
        
        timelineChart.update();

    }, 1000);

    // --- Interactions ---
    btnToggleDemo.addEventListener('click', () => {
        isEscalated = !isEscalated;
        
        if (isEscalated) {
            btnToggleDemo.textContent = "Reset Demo";
            alertCardEl.classList.add('escalated');
            btnEscalate.classList.remove('hidden');
            globalAlert.classList.remove('hidden');
            pulseIndicator.classList.add('risk');
        } else {
            btnToggleDemo.textContent = "Toggle Demo Risk";
            alertCardEl.classList.remove('escalated');
            btnEscalate.classList.add('hidden');
            globalAlert.classList.add('hidden');
            pulseIndicator.classList.remove('risk');
        }
    });
});
