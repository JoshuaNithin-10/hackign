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
        Happy: document.getElementById('bar-Happy'),
        Angry: document.getElementById('bar-Angry'),
        Sad: document.getElementById('bar-Sad'),
        neutral: document.getElementById('bar-neutral')
    };
    const vals = {
        stressed: document.getElementById('val-stressed'),
        Happy: document.getElementById('val-Happy'),
        Angry: document.getElementById('val-Angry'),
        Sad: document.getElementById('val-Sad'),
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

    const btnMic = document.getElementById('btn-mic');

let mediaRecorder = null;
let localStream = null;
let isRecording = false;
let audioChunks = [];

btnMic.addEventListener("click", async () => {
    if (!isRecording) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(localStream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (audioChunks.length === 0) return;
                
                // Show analyzing state
                const originalText = btnMic.innerHTML;
                btnMic.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg> Analyzing...`;
                btnMic.style.opacity = '0.7';
                btnMic.style.pointerEvents = 'none';

                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append("audio", blob, "chunk.webm");
                
                try {
                    const response = await fetch("/analyze_audio", {
                        method: "POST",
                        body: formData
                    });
                    const result = await response.json();
                    console.log("Analysis Result:", result);
                    updateUI(result);
                } catch (error) {
                    console.error("Error sending audio:", error);
                    alert("Error analyzing audio: " + error.message);
                } finally {
                    btnMic.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg> Start Mic`;
                    btnMic.style.opacity = '1';
                    btnMic.style.pointerEvents = 'auto';
                }
            };

            mediaRecorder.start();
            isRecording = true;
            btnMic.classList.add("recording");
            btnMic.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;"><rect x="6" y="6" width="12" height="12"></rect></svg> Stop Mic`;
        } catch (err) {
            alert("Microphone permission denied or unavailable.");
            console.error(err);
        }
    } else {
        isRecording = false;
        btnMic.classList.remove("recording");
        
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
    }
});

function updateUI(result) {
    if (result.error) {
        console.error("Backend returned error:", result.error);
        alert("Error from backend: " + result.error);
        return;
    }

    // Map backend emotion to frontend expected keys
    let primaryKey = 'neutral';
    const ae = result.audio_emotion;
    if (ae === 'ang') primaryKey = 'Angry';
    else if (ae === 'sad') primaryKey = 'Sad';
    else if (ae === 'hap') primaryKey = 'Happy';
    else if (ae === 'neu') primaryKey = 'neutral';
    else if (ae === 'fea' || ae === 'sur' || ae === 'dis') primaryKey = 'stressed';

    const maxVal = result.audio_confidence || 100;
        
    let data = {
        stressed: 0,
        Happy: 0,
        Angry: 0,
        Sad: 0,
        neutral: 0
    };
    
    data[primaryKey] = maxVal;
    let remaining = 100 - maxVal;
    for (let k in data) {
        if (k !== primaryKey) {
            data[k] = remaining / 4;
        }
    }

    // Update UI Progress Bars & Texts
    for (const [key, val] of Object.entries(data)) {
        const pct = Math.round(val);
        if (bars[key]) bars[key].style.width = `${pct}%`;
        if (vals[key]) vals[key].textContent = `${pct}%`;
    }

    // Update Primary Card
    const emotionMap = {
        neutral: { title: 'Neutral', text: 'Caller maintaining baseline vocal patterns.', color: 'var(--color-neutral)', risk: 'Normal' },
        stressed: { title: 'Stressed', text: 'Elevated pitch and tempo detected.', color: 'var(--color-stressed)', risk: 'Warning' },
        Angry: { title: 'Angry', text: 'Aggressive tone and keywords detected.', color: 'var(--color-angry)', risk: 'Critical' },
        Happy: { title: 'Happy', text: 'Positive and calm tone detected.', color: 'var(--color-happy)', risk: 'Low Risk' },
        Sad: { title: 'Sad', text: 'Downcast pitch and sorrowful patterns.', color: 'var(--color-sad)', risk: 'Elevated' }
    };

    const info = emotionMap[primaryKey];
    primaryEmotionEl.textContent = info.title;
    primaryEmotionEl.style.color = info.color;
    
    // Append transcript to description
    let descText = info.text;
    if (result.transcript) {
        descText += ` | Transcript: "${result.transcript}"`;
    } else {
        descText += ` | Transcript: (No speech detected)`;
    }
    emotionDescEl.textContent = descText;
    
    primaryConfidenceEl.textContent = `${Math.round(maxVal)}%`;
    
    riskBadgeEl.textContent = result.priority || info.risk;
    riskBadgeEl.style.color = info.color;
    riskBadgeEl.style.borderColor = info.color;
    riskBadgeEl.style.background = `rgba(0,0,0,0.3)`;

    // Update Modality Metrics (Voice, Text, Overall)
    let voiceConf = result.audio_confidence || 0;
    let textConf = result.text_confidence || 0;
    let overallConf = (voiceConf * 0.4) + (textConf * 0.6); 

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
    let riskScore = 15;
    if (result.priority === 'HIGH') riskScore = 85;
    else if (result.priority === 'MEDIUM') riskScore = 55;

    timelineChart.data.datasets[0].data.shift();
    timelineChart.data.datasets[0].data.push(riskScore);
    
    // Change chart color based on risk
    timelineChart.data.datasets[0].borderColor = (riskScore > 60) ? '#ef4444' : '#3b82f6';
    
    timelineChart.update();
}

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
let callSeconds = 0;

function startCallTimer(){

    const durationEl = document.getElementById("call-duration");

    setInterval(() => {

        callSeconds++;

        const minutes = Math.floor(callSeconds / 60);
        const seconds = callSeconds % 60;

        const formattedTime =
            String(minutes).padStart(2,'0') + ":" +
            String(seconds).padStart(2,'0');

        durationEl.textContent = formattedTime;

    }, 1000);

}