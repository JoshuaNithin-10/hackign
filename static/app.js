document.addEventListener('DOMContentLoaded', () => {

    // -----------------------
    // STATE
    // -----------------------

    let callDurationSec = 0;
    let emotionCounts = {
        happy: 0,
        sad: 0,
        angry: 0,
        stress: 0,
        neutral: 0
    };
    let totalEmotions = 0;

    // -----------------------
    // DOM ELEMENTS
    // -----------------------

    const primaryEmotionEl = document.getElementById('primary-emotion');
    const emotionDescEl = document.getElementById('emotion-desc');
    const primaryConfidenceEl = document.getElementById('primary-confidence');
    const riskBadgeEl = document.getElementById('risk-badge');
    const durationEl = document.getElementById('call-duration');

    const bars = {
        happy: document.getElementById('bar-happy'),
        sad: document.getElementById('bar-sad'),
        angry: document.getElementById('bar-angry'),
        stress: document.getElementById('bar-stress'),
        neutral: document.getElementById('bar-neutral')
    };

    const vals = {
        happy: document.getElementById('val-happy'),
        sad: document.getElementById('val-sad'),
        angry: document.getElementById('val-angry'),
        stress: document.getElementById('val-stress'),
        neutral: document.getElementById('val-neutral')
    };

    // -----------------------
    // CHART SETUP
    // -----------------------

    const ctx = document.getElementById('timeline-chart').getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59,130,246,0.5)');
    gradient.addColorStop(1, 'rgba(59,130,246,0)');

    const timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(""),
            datasets: [{
                data: Array(20).fill(5),
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
            scales: {
                y: { min:0, max:100 }
            },
            plugins: { legend:{display:false} }
        }
    });

    // -----------------------
    // TIMER
    // -----------------------

    function formatTime(sec){
        const m = Math.floor(sec/60).toString().padStart(2,'0');
        const s = (sec%60).toString().padStart(2,'0');
        return `${m}:${s}`;
    }

    setInterval(()=>{
        callDurationSec++;
        durationEl.textContent = formatTime(callDurationSec);
    },1000);


    // -----------------------
    // STREAM EMOTION DATA
    // -----------------------

    // use Server-Sent Events to receive a continuous stream of emotion data
    function startEmotionStream(){
        const source = new EventSource("/stream");
        source.onmessage = e => {
            const data = JSON.parse(e.data);
            updateDashboard(data);
        };
        source.onerror = err => {
            console.error("SSE error", err);
            // optionally try to reconnect or stop
        };
    }

    // -----------------------
    // UPDATE DASHBOARD
    // -----------------------

    function updateDashboard(data){

        const emotion = data.emotion.toLowerCase();
        const confidence = Math.round(data.confidence * 100);

        // Main emotion text
        primaryEmotionEl.textContent = emotion;
        primaryConfidenceEl.textContent = confidence + "%";

        emotionDescEl.textContent =
            "Emotion detected from voice analysis with confidence " + confidence + "%";


        // Color mapping
        const colorMap = {
            neutral: "var(--color-neutral)",
            sad: "var(--color-pain)",
            angry: "var(--color-abusive)",
            fear: "var(--color-stressed)",
            happy: "var(--color-neutral)",
            stress: "var(--color-stressed)"
        };

        primaryEmotionEl.style.color = colorMap[emotion] || "white";


        // Risk label
        if(emotion === "angry"){
            riskBadgeEl.textContent = "CRITICAL";
        }
        else if(emotion === "fear" || emotion === "stress"){
            riskBadgeEl.textContent = "WARNING";
        }
        else{
            riskBadgeEl.textContent = "NORMAL";
        }


        updateGraphs(emotion, confidence);
        updateTimeline(confidence);
    }


    // -----------------------
    // UPDATE PROGRESS BARS
    // -----------------------

    function updateGraphs(emotion, confidence){

        let data = {
            happy:0,
            sad:0,
            angry:0,
            stress:0,
            neutral:0
        };

        if(emotion.includes("happy")){
            data.happy = confidence;
        }
        else if(emotion.includes("sad")){
            data.sad = confidence;
        }
        else if(emotion.includes("angry")){
            data.angry = confidence;
        }
        else if(emotion.includes("fear") || emotion.includes("stress")){
            data.stress = confidence;
        }
        else{
            data.neutral = confidence;
        }

        for(const [key,val] of Object.entries(data)){
            bars[key].style.width = val + "%";
            vals[key].textContent = val + "%";
        }

    }


    // -----------------------
    // UPDATE TIMELINE GRAPH
    // -----------------------

    function updateTimeline(score){

        timelineChart.data.datasets[0].data.shift();
        timelineChart.data.datasets[0].data.push(score);

        timelineChart.update();
    }


    // -----------------------
    // START STREAM
    // -----------------------

    startEmotionStream();

});