// app.js
// Orchestrates navigation, UI views, data-store interactions, and local Audio synthesizers.

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. STATE & INITIALIZATION
  // ==========================================
  let profile = StudyStore.getProfile();
  let settings = StudyStore.getSettings();
  let activeView = 'dashboard';
  
  // Apply theme & primary accent color
  function applyThemeAndAccent() {
    document.documentElement.setAttribute('data-theme', profile.theme || 'dark');
    document.documentElement.style.setProperty('--primary', profile.accentColor || '#8b5cf6');
    
    // Update profile text in sidebar
    document.getElementById('sidebar-name').textContent = profile.name;
    document.getElementById('sidebar-avatar').textContent = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    // Set settings values
    document.getElementById('settings-username').value = profile.name;
    document.getElementById('settings-level').value = profile.level;
    document.getElementById('settings-goal').value = profile.dailyGoal;
    document.getElementById('settings-theme').value = profile.theme;
    document.getElementById('settings-accent').value = profile.accentColor;
    document.getElementById('settings-api-key').value = settings.apiKey;
    
    // Update goal labels
    document.getElementById('table-goal-time').textContent = `${profile.dailyGoal} mins / day`;
  }
  
  // Refresh header/streak badge
  function refreshStreak() {
    const streak = StudyStore.getStreak();
    document.getElementById('sidebar-streak-count').textContent = streak.count;
    document.getElementById('header-streak-text').textContent = `${streak.count} Day Streak`;
  }

  // ==========================================
  // 2. SIDEBAR ROUTING & VIEW TRANSITION
  // ==========================================
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const currentViewTitle = document.getElementById('current-view-title');

  function switchView(viewId) {
    activeView = viewId;
    navItems.forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    viewPanels.forEach(panel => {
      if (panel.getAttribute('id') === `view-${viewId}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Capitalize view title
    const titleMap = {
      'dashboard': 'Dashboard',
      'explainer': 'AI Concept Explainer',
      'planner': 'Study Planner',
      'quizzes': 'Quizzes & Flashcards (SRS)',
      'timer': 'Focus Timer & Ambience',
      'buddy': 'Study Buddy Simulator',
      'analytics': 'Analytics & Study Logs',
      'settings': 'Settings'
    };
    currentViewTitle.textContent = titleMap[viewId] || 'StudyMate AI';
    
    // Specific view initializations
    if (viewId === 'dashboard') {
      renderDashboard();
    } else if (viewId === 'analytics') {
      renderAnalytics();
    } else if (viewId === 'quizzes') {
      initQuizView();
      initFlashcardView();
    } else if (viewId === 'planner') {
      renderPlannerView();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.getAttribute('data-view'));
    });
  });

  // ==========================================
  // 3. DASHBOARD RENDER & CHART DRAWING
  // ==========================================
  function renderDashboard() {
    const stats = StudyStore.getAnalytics();
    
    // Quick stat counters
    document.getElementById('stat-total-time').textContent = `${stats.totalTime} mins`;
    document.getElementById('stat-plan-rate').textContent = `${stats.completionRate}%`;
    document.getElementById('stat-quiz-accuracy').textContent = `${stats.averageScore}%`;

    // Dynamic Coach Suggestion
    const recText = document.getElementById('dashboard-recommendation-text');
    const recActionBtn = document.getElementById('btn-rec-action');
    const plans = StudyStore.getStudyPlans();

    if (plans.length === 0) {
      recText.textContent = "It looks like you don't have any active study schedules yet! Let's generate a custom study plan to coordinate your upcoming examinations.";
      recActionBtn.textContent = "Create Study Plan";
      recActionBtn.onclick = () => switchView('planner');
    } else {
      const activePlan = plans[plans.length - 1];
      const incompleteTasks = activePlan.tasks.filter(t => !t.completed);
      if (incompleteTasks.length > 0) {
        recText.textContent = `Focus suggestion: work on "${activePlan.subject}" tasks. Next task: "${incompleteTasks[0].text}". Ticking tasks off updates your streak metrics!`;
        recActionBtn.textContent = "View Study Plan";
        recActionBtn.onclick = () => {
          switchView('planner');
          document.getElementById('planner-select-plan').value = activePlan.id;
          renderPlanDetails(activePlan.id);
        };
      } else {
        recText.textContent = `Outstanding! You completed all scheduled targets for "${activePlan.subject}". Try creating a quick quiz to check your memory recall!`;
        recActionBtn.textContent = "Test with Quiz";
        recActionBtn.onclick = () => {
          switchView('quizzes');
          document.getElementById('quiz-topic').value = activePlan.subject;
        };
      }
    }

    // Render SVG Bar Chart
    const svg = document.getElementById('dashboard-svg-chart');
    // Clear previous bars/texts (keep grid lines)
    const elementsToRemove = svg.querySelectorAll('.chart-bar, .chart-text, .chart-label');
    elementsToRemove.forEach(el => el.remove());

    const maxMinutes = Math.max(...stats.chartData.map(d => d.minutes), 30); // scale factor minimum
    const chartWidth = 340;
    const startX = 50;
    const barWidth = 30;
    const gap = 15;
    const chartHeight = 130; // base y = 150 (grid line)

    stats.chartData.forEach((dataPoint, idx) => {
      const x = startX + idx * (barWidth + gap);
      const scaledHeight = (dataPoint.minutes / maxMinutes) * chartHeight;
      const y = 150 - scaledHeight;

      // Draw Bar
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", barWidth);
      rect.setAttribute("height", scaledHeight);
      rect.setAttribute("class", "chart-bar");
      svg.appendChild(rect);

      // Draw minute labels above bars if non-zero
      if (dataPoint.minutes > 0) {
        const textVal = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textVal.setAttribute("x", x + barWidth / 2);
        textVal.setAttribute("y", y - 6);
        textVal.setAttribute("class", "chart-text chart-label");
        textVal.textContent = `${dataPoint.minutes}m`;
        svg.appendChild(textVal);
      }

      // Draw day label below
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", x + barWidth / 2);
      label.setAttribute("y", 168);
      label.setAttribute("class", "chart-text chart-label");
      label.textContent = dataPoint.day;
      svg.appendChild(label);
    });

    // Render Today's Tasks
    const todayTasksDiv = document.getElementById('dashboard-today-tasks');
    todayTasksDiv.innerHTML = '';
    
    let renderedCount = 0;
    plans.forEach(p => {
      p.tasks.forEach(t => {
        if (!t.completed && renderedCount < 3) {
          renderedCount++;
          const taskItem = document.createElement('div');
          taskItem.className = 'checklist-item';
          taskItem.innerHTML = `
            <div class="checklist-checkbox" onclick="toggleDashboardTask('${p.id}', '${t.id}')"></div>
            <div class="checklist-text"><strong>${p.subject}:</strong> ${t.text}</div>
          `;
          todayTasksDiv.appendChild(taskItem);
        }
      });
    });

    if (renderedCount === 0) {
      todayTasksDiv.innerHTML = '<p class="text-sm text-slate-500 italic">No tasks due today. You are fully caught up!</p>';
    }
  }

  // Handle checking checklist tasks from dashboard directly
  window.toggleDashboardTask = (planId, taskId) => {
    StudyStore.toggleTask(planId, taskId);
    renderDashboard();
    refreshStreak();
  };

  // Quick Coach chat prompt
  document.getElementById('btn-quick-coach-send').onclick = () => {
    const inp = document.getElementById('quick-coach-input');
    const val = inp.value.trim();
    if (val) {
      switchView('explainer');
      document.getElementById('explainer-topic').value = val;
      generateAIExplanation();
      inp.value = '';
    }
  };

  // ==========================================
  // 4. CONCEPT EXPLAINER CONTROLLER
  // ==========================================
  async function generateAIExplanation() {
    const topic = document.getElementById('explainer-topic').value.trim();
    const style = document.getElementById('explainer-style').value;
    const outputContainer = document.getElementById('explainer-output-container');
    const loader = document.getElementById('explainer-loader');
    const actionsRow = document.getElementById('explainer-actions-row');

    if (!topic) return;

    // Show loading UI
    outputContainer.innerHTML = '';
    actionsRow.style.display = 'none';
    loader.style.display = 'flex';

    try {
      const html = await StudyAIService.generateExplanation(topic, style, settings.apiKey);
      outputContainer.innerHTML = html;
      actionsRow.style.display = 'flex';
      
      // Hook actions
      document.getElementById('btn-explainer-create-plan').onclick = () => {
        switchView('planner');
        document.getElementById('planner-subject').value = topic;
      };
      document.getElementById('btn-explainer-create-quiz').onclick = () => {
        switchView('quizzes');
        document.getElementById('quiz-topic').value = topic;
        // Automatically switch subtab to quiz
        document.getElementById('btn-subtab-quiz').click();
      };
      
      // Log session
      StudyStore.logSession(5, 'Explainer', `${topic} (${style})`);
      refreshStreak();
    } catch (e) {
      outputContainer.innerHTML = `<p class="text-red-400">Failed to generate explanation: ${e.message}. Please verify your API Key or connection.</p>`;
    } finally {
      loader.style.display = 'none';
    }
  }

  document.getElementById('btn-explain-generate').onclick = generateAIExplanation;
  
  document.getElementById('btn-explainer-copy').onclick = () => {
    const text = document.getElementById('explainer-output-container').innerText;
    navigator.clipboard.writeText(text).then(() => {
      const copyBtn = document.getElementById('btn-explainer-copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    });
  };

  // ==========================================
  // 5. STUDY PLANNER CONTROLLER
  // ==========================================
  function renderPlannerView() {
    const plans = StudyStore.getStudyPlans();
    const dropdown = document.getElementById('planner-select-plan');
    const wrapper = document.getElementById('planner-select-wrapper');
    const container = document.getElementById('planner-output-container');
    const actionsRow = document.getElementById('planner-actions-row');

    dropdown.innerHTML = '';
    
    if (plans.length === 0) {
      wrapper.style.display = 'none';
      container.innerHTML = '<p class="italic text-slate-500">Create a schedule using the options pane on the left.</p>';
      actionsRow.style.display = 'none';
      return;
    }

    wrapper.style.display = 'block';
    plans.forEach(plan => {
      const opt = document.createElement('option');
      opt.value = plan.id;
      opt.textContent = `${plan.subject} (${plan.durationDays}d)`;
      dropdown.appendChild(opt);
    });

    // Display first plan by default or current value
    const firstPlanId = plans[plans.length - 1].id;
    dropdown.value = firstPlanId;
    renderPlanDetails(firstPlanId);
  }

  function renderPlanDetails(planId) {
    const plans = StudyStore.getStudyPlans();
    const plan = plans.find(p => p.id === planId);
    const container = document.getElementById('planner-output-container');
    const actionsRow = document.getElementById('planner-actions-row');
    const progressLabel = document.getElementById('planner-progress-percent');

    if (!plan) return;

    actionsRow.style.display = 'flex';
    container.innerHTML = '';

    // Calculate progress
    const total = plan.tasks.length;
    const completed = plan.tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    progressLabel.textContent = `Progress: ${percent}%`;

    // Group tasks by Day
    const dayMap = {};
    plan.tasks.forEach(task => {
      if (!dayMap[task.day]) dayMap[task.day] = [];
      dayMap[task.day].push(task);
    });

    Object.keys(dayMap).sort((a,b)=>a-b).forEach(day => {
      const dayHeader = document.createElement('h4');
      dayHeader.className = 'text-sm font-bold text-purple-400 mt-4 mb-2';
      dayHeader.textContent = `Day ${day}`;
      container.appendChild(dayHeader);

      dayMap[day].forEach(task => {
        const item = document.createElement('div');
        item.className = 'checklist-item';
        item.innerHTML = `
          <div class="checklist-checkbox ${task.completed ? 'checked' : ''}" onclick="togglePlannerTask('${plan.id}', '${task.id}')">
            ${task.completed ? '✓' : ''}
          </div>
          <div class="checklist-text">${task.text}</div>
        `;
        container.appendChild(item);
      });
    });

    document.getElementById('btn-planner-delete').onclick = () => {
      StudyStore.deleteStudyPlan(plan.id);
      renderPlannerView();
    };
  }

  window.togglePlannerTask = (planId, taskId) => {
    StudyStore.toggleTask(planId, taskId);
    renderPlanDetails(planId);
    refreshStreak();
  };

  document.getElementById('planner-select-plan').onchange = (e) => {
    renderPlanDetails(e.target.value);
  };

  document.getElementById('btn-plan-generate').onclick = async () => {
    const subject = document.getElementById('planner-subject').value.trim();
    const days = parseInt(document.getElementById('planner-days').value) || 3;
    const hours = parseInt(document.getElementById('planner-hours').value) || 2;
    const loader = document.getElementById('planner-loader');
    const container = document.getElementById('planner-output-container');

    if (!subject) return;

    container.innerHTML = '';
    loader.style.display = 'flex';

    try {
      const tasks = await StudyAIService.generateStudyPlan(subject, days, hours, settings.apiKey);
      StudyStore.addStudyPlan(subject, days, hours, tasks);
      renderPlannerView();
      
      // Log session
      StudyStore.logSession(10, 'Study Planner', `Schedule generated: ${subject}`);
      refreshStreak();
    } catch(e) {
      container.innerHTML = `<p class="text-red-400">Failed to build plan: ${e.message}</p>`;
    } finally {
      loader.style.display = 'none';
    }
  };

  // ==========================================
  // 6. QUIZ & FLASHCARDS CONTROLLERS
  // ==========================================
  let activeQuizQuestions = [];
  let currentQuizIdx = 0;
  let correctQuizCount = 0;
  let activeFlashcardDeck = [];
  let currentFlashcardIdx = 0;

  function initQuizView() {
    // Subtabs switcher
    document.getElementById('btn-subtab-quiz').onclick = () => {
      document.getElementById('btn-subtab-quiz').classList.add('active');
      document.getElementById('btn-subtab-flashcards').classList.remove('active');
      document.getElementById('quiz-panel').style.display = 'block';
      document.getElementById('flashcards-panel').style.display = 'none';
    };
    
    document.getElementById('btn-subtab-flashcards').onclick = () => {
      document.getElementById('btn-subtab-flashcards').classList.add('active');
      document.getElementById('btn-subtab-quiz').classList.remove('active');
      document.getElementById('quiz-panel').style.display = 'none';
      document.getElementById('flashcards-panel').style.display = 'block';
      loadSRSFlashcardDeck();
    };

    document.getElementById('btn-quiz-generate').onclick = async () => {
      const topic = document.getElementById('quiz-topic').value.trim();
      const playBoard = document.getElementById('quiz-play-board');
      const introBoard = document.getElementById('quiz-intro-board');
      const resultBoard = document.getElementById('quiz-result-board');
      const loader = document.getElementById('quiz-loader');

      if (!topic) return;

      introBoard.style.display = 'none';
      resultBoard.style.display = 'none';
      playBoard.style.display = 'none';
      loader.style.display = 'flex';

      try {
        const data = await StudyAIService.generateQuizAndFlashcards(topic, settings.apiKey);
        activeQuizQuestions = data.quiz || [];
        
        // Auto import generated flashcards to SRS collection!
        if (data.flashcards) {
          data.flashcards.forEach(fc => {
            StudyStore.addFlashcard(topic, fc.question, fc.answer);
          });
        }

        currentQuizIdx = 0;
        correctQuizCount = 0;
        
        if (activeQuizQuestions.length > 0) {
          loader.style.display = 'none';
          playBoard.style.display = 'block';
          renderQuizQuestion();
        } else {
          throw new Error("No quiz data loaded");
        }
      } catch (e) {
        loader.style.display = 'none';
        introBoard.style.display = 'block';
        alert(`Failed to load quiz: ${e.message}`);
      }
    };

    document.getElementById('btn-quiz-restart').onclick = () => {
      document.getElementById('quiz-result-board').style.display = 'none';
      document.getElementById('quiz-intro-board').style.display = 'block';
    };
  }

  function renderQuizQuestion() {
    const q = activeQuizQuestions[currentQuizIdx];
    document.getElementById('quiz-question-number').textContent = `Question ${currentQuizIdx + 1} of ${activeQuizQuestions.length}`;
    document.getElementById('quiz-timer').textContent = `Score: ${correctQuizCount}/${currentQuizIdx}`;
    document.getElementById('quiz-question-text').textContent = q.question;

    const optWrapper = document.getElementById('quiz-options-wrapper');
    optWrapper.innerHTML = '';

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.onclick = () => checkQuizAnswer(btn, opt, q.answer);
      optWrapper.appendChild(btn);
    });
  }

  function checkQuizAnswer(selectedBtn, chosenOpt, correctOpt) {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true); // lock interface

    const topic = document.getElementById('quiz-topic').value;

    if (chosenOpt === correctOpt) {
      selectedBtn.classList.add('correct');
      correctQuizCount++;
    } else {
      selectedBtn.classList.add('incorrect');
      // Highlight correct one
      buttons.forEach(btn => {
        if (btn.textContent === correctOpt) {
          btn.classList.add('correct');
        }
      });
    }

    setTimeout(() => {
      currentQuizIdx++;
      if (currentQuizIdx < activeQuizQuestions.length) {
        renderQuizQuestion();
      } else {
        // Complete Quiz
        document.getElementById('quiz-play-board').style.display = 'none';
        const scoreBoard = document.getElementById('quiz-result-board');
        scoreBoard.style.display = 'block';
        
        const accuracy = Math.round((correctQuizCount / activeQuizQuestions.length) * 100);
        document.getElementById('quiz-result-score').textContent = `${correctQuizCount} / ${activeQuizQuestions.length} (${accuracy}%)`;
        
        const remark = accuracy >= 80 ? "Superb job! You've mastered this subject." : accuracy >= 50 ? "Good try! A bit more review will secure an excellent score." : "Needs more focus. Study the concept summary and try again!";
        document.getElementById('quiz-result-remark').textContent = remark;

        // Log session
        StudyStore.logSession(15, 'Quiz', `MCQ Quiz: ${topic} (${accuracy}%)`);
        refreshStreak();
      }
    }, 1800);
  }

  // --- Flashcard Deck Logic (SRS) ---
  function initFlashcardView() {
    const cardEl = document.getElementById('flashcard-element');
    cardEl.onclick = () => {
      cardEl.classList.toggle('flipped');
      const flipped = cardEl.classList.contains('flipped');
      document.getElementById('fc-srs-panel').style.visibility = flipped ? 'visible' : 'hidden';
    };

    document.getElementById('btn-fc-add').onclick = () => {
      const subject = document.getElementById('fc-add-subject').value.trim();
      const question = document.getElementById('fc-add-question').value.trim();
      const answer = document.getElementById('fc-add-answer').value.trim();

      if (subject && question && answer) {
        StudyStore.addFlashcard(subject, question, answer);
        document.getElementById('fc-add-question').value = '';
        document.getElementById('fc-add-answer').value = '';
        loadSRSFlashcardDeck();
      }
    };

    // SRS buttons actions
    document.getElementById('btn-srs-again').onclick = (e) => { e.stopPropagation(); processSRSReview('again'); };
    document.getElementById('btn-srs-hard').onclick = (e) => { e.stopPropagation(); processSRSReview('hard'); };
    document.getElementById('btn-srs-easy').onclick = (e) => { e.stopPropagation(); processSRSReview('easy'); };
  }

  function loadSRSFlashcardDeck() {
    activeFlashcardDeck = StudyStore.getDueFlashcards();
    currentFlashcardIdx = 0;
    
    const countBadge = document.getElementById('fc-count-due');
    countBadge.textContent = `SRS DUE: ${activeFlashcardDeck.length} CARDS`;

    const deckIndex = document.getElementById('fc-deck-index');
    const cardWrapper = document.getElementById('flashcard-element');
    const emptyBoard = document.getElementById('fc-empty-board');

    if (activeFlashcardDeck.length === 0) {
      cardWrapper.style.display = 'none';
      deckIndex.style.display = 'none';
      emptyBoard.style.display = 'block';
      document.getElementById('fc-srs-panel').style.visibility = 'hidden';
      return;
    }

    cardWrapper.style.display = 'block';
    deckIndex.style.display = 'block';
    emptyBoard.style.display = 'none';

    renderActiveFlashcard();
  }

  function renderActiveFlashcard() {
    const card = activeFlashcardDeck[currentFlashcardIdx];
    document.getElementById('fc-deck-index').textContent = `Card ${currentFlashcardIdx + 1} of ${activeFlashcardDeck.length}`;
    
    // Set card values
    document.getElementById('fc-card-subject').textContent = card.subject;
    document.getElementById('fc-card-question').textContent = card.question;
    document.getElementById('fc-card-answer').textContent = card.answer;

    // Reset flips
    const cardWrapper = document.getElementById('flashcard-element');
    cardWrapper.classList.remove('flipped');
    document.getElementById('fc-srs-panel').style.visibility = 'hidden';
  }

  function processSRSReview(feedback) {
    const card = activeFlashcardDeck[currentFlashcardIdx];
    if (card) {
      StudyStore.reviewFlashcard(card.id, feedback);
      StudyStore.logSession(1, 'Quiz & Flashcards', `Reviewed card: ${card.question.substring(0,25)}...`);
    }

    currentFlashcardIdx++;
    if (currentFlashcardIdx < activeFlashcardDeck.length) {
      renderActiveFlashcard();
    } else {
      // Reload deck (items might have scheduled out of the due array)
      loadSRSFlashcardDeck();
    }
    refreshStreak();
  }

  // ==========================================
  // 7. POMODORO FOCUS TIMER (WITH SOUND SYNTH)
  // ==========================================
  let timerInterval = null;
  let timerSecondsLeft = 25 * 60;
  let timerMaxSeconds = 25 * 60;
  let timerIsRunning = false;
  let timerCurrentMode = 'study'; // 'study', 'break'

  // Web Audio Context Synthesizer for Offline Ambient Focus Tracks
  let audioCtx = null;
  let activeSynthNodes = [];

  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function stopAllSynthAudio() {
    activeSynthNodes.forEach(node => {
      try { node.stop(); } catch(e){}
      try { node.disconnect(); } catch(e){}
    });
    activeSynthNodes = [];
  }

  // Web Audio Synth loops
  function playSynthSound(type) {
    initAudioContext();
    stopAllSynthAudio();

    if (type === 'off') {
      document.getElementById('audio-active-badge').textContent = 'SYNTH MUTE';
      return;
    }

    document.getElementById('audio-active-badge').textContent = `PLAYING ${type.toUpperCase()}`;

    if (type === 'rain') {
      // Generate White Noise Buffer
      const bufferSize = 2 * audioCtx.sampleRate;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      // Create Noise Source Node
      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Pass through a Low-Pass Biquad Filter to make it sound like rumbling rain
      const rainFilter = audioCtx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 400; // Low frequency cuts highs

      // Gain controls
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.15; // Soft rain volume

      // Slow amplitude modulator (simulating wind/gust variations in rain)
      const modulator = audioCtx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.value = 0.1; // Very slow LFO (10 seconds per cycle)
      const modulatorGain = audioCtx.createGain();
      modulatorGain.gain.value = 0.05;

      // Connect LFO modulator
      modulator.connect(modulatorGain);
      modulatorGain.connect(gainNode.gain);

      noiseSource.connect(rainFilter);
      rainFilter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      modulator.start();
      noiseSource.start();

      activeSynthNodes.push(noiseSource, modulator);
    } 
    else if (type === 'lofi') {
      // Binaural Beat generator (40Hz difference for Alpha wave concentration)
      const oscLeft = audioCtx.createOscillator();
      oscLeft.type = 'sine';
      oscLeft.frequency.value = 100; // Left channel frequency

      const oscRight = audioCtx.createOscillator();
      oscRight.type = 'sine';
      oscRight.frequency.value = 140; // Right channel frequency (140 - 100 = 40Hz binaural)

      // Pan nodes for stereo
      const pannerLeft = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
      const pannerRight = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

      const gainLeft = audioCtx.createGain();
      gainLeft.gain.value = 0.05;
      const gainRight = audioCtx.createGain();
      gainRight.gain.value = 0.05;

      if (pannerLeft && pannerRight) {
        pannerLeft.pan.value = -1;
        pannerRight.pan.value = 1;

        oscLeft.connect(pannerLeft);
        pannerLeft.connect(gainLeft);
        
        oscRight.connect(pannerRight);
        pannerRight.connect(gainRight);
      } else {
        oscLeft.connect(gainLeft);
        oscRight.connect(gainRight);
      }

      gainLeft.connect(audioCtx.destination);
      gainRight.connect(audioCtx.destination);

      oscLeft.start();
      oscRight.start();

      activeSynthNodes.push(oscLeft, oscRight);
    } 
    else if (type === 'forest') {
      // Brownian Noise (red noise) simulates deep wind
      const bufferSize = 2 * audioCtx.sampleRate;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // compensation gain
      }

      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;

      const gain = audioCtx.createGain();
      gain.gain.value = 0.12;

      // Slow wind modulation
      const windOsc = audioCtx.createOscillator();
      windOsc.type = 'sine';
      windOsc.frequency.value = 0.05; // 20-second waves
      const windGain = audioCtx.createGain();
      windGain.gain.value = 80;

      windOsc.connect(windGain);
      windGain.connect(filter.frequency); // modulate lowpass frequency

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      windOsc.start();
      noiseSource.start();

      activeSynthNodes.push(noiseSource, windOsc);
    }
  }

  // Trigger sound selections
  const soundOpts = document.querySelectorAll('.sound-option');
  soundOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      soundOpts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      playSynthSound(opt.getAttribute('data-sound'));
    });
  });

  // Short completion beep synthesizer
  function triggerBeepNotification() {
    initAudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  }

  // Timer Core logic
  const timerCountdown = document.getElementById('timer-countdown');
  const timerModeText = document.getElementById('timer-mode');
  const timerRing = document.getElementById('timer-progress-ring');
  const timerToggleBtn = document.getElementById('btn-timer-toggle');

  function updateTimerDisplay() {
    const mins = Math.floor(timerSecondsLeft / 60);
    const secs = timerSecondsLeft % 60;
    timerCountdown.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // SVG dash offset subtraction calculation (Dasharray is 691)
    const ratio = timerSecondsLeft / timerMaxSeconds;
    const offset = 691 - (ratio * 691);
    timerRing.style.strokeDashoffset = offset;
  }

  function toggleTimer() {
    initAudioContext();
    if (timerIsRunning) {
      // Pause
      clearInterval(timerInterval);
      timerIsRunning = false;
      timerToggleBtn.textContent = 'Start';
    } else {
      // Start
      timerIsRunning = true;
      timerToggleBtn.textContent = 'Pause';
      timerInterval = setInterval(() => {
        timerSecondsLeft--;
        if (timerSecondsLeft <= 0) {
          clearInterval(timerInterval);
          timerIsRunning = false;
          timerToggleBtn.textContent = 'Start';
          handleTimerComplete();
        }
        updateTimerDisplay();
      }, 1000);
    }
  }

  function handleTimerComplete() {
    triggerBeepNotification();
    if (timerCurrentMode === 'study') {
      const topic = document.getElementById('timer-subject-log').value.trim() || 'General Session';
      const durationMin = Math.round(timerMaxSeconds / 60);
      
      StudyStore.logSession(durationMin, 'Pomodoro', topic);
      
      // Swap to break
      timerCurrentMode = 'break';
      timerMaxSeconds = 5 * 60; // 5 mins break
      timerSecondsLeft = 5 * 60;
      timerModeText.textContent = 'Short Break';
      alert("Study Session Complete! Take a short break.");
    } else {
      // Break completed, return to study
      timerCurrentMode = 'study';
      timerMaxSeconds = 25 * 60;
      timerSecondsLeft = 25 * 60;
      timerModeText.textContent = 'Study Time';
      alert("Break is over! Ready to focus?");
    }
    updateTimerDisplay();
    refreshStreak();
  }

  document.getElementById('btn-timer-toggle').onclick = toggleTimer;

  document.getElementById('btn-timer-reset').onclick = () => {
    clearInterval(timerInterval);
    timerIsRunning = false;
    timerToggleBtn.textContent = 'Start';
    timerCurrentMode = 'study';
    timerMaxSeconds = 25 * 60;
    timerSecondsLeft = 25 * 60;
    timerModeText.textContent = 'Study Time';
    updateTimerDisplay();
  };

  document.getElementById('btn-timer-skip').onclick = () => {
    clearInterval(timerInterval);
    timerIsRunning = false;
    timerToggleBtn.textContent = 'Start';
    handleTimerComplete();
  };

  // ==========================================
  // 8. STUDY BUDDY SIMULATOR CHATROOM
  // ==========================================
  let activeBuddy = 'emma';
  let chatHistory = {
    emma: [{ sender: 'buddy', text: 'Hey there! I am Emma, your encouraging study partner. What topic are we diving into today? I am super excited to learn with you! 🌸' }],
    alex: [{ sender: 'buddy', text: 'Greetings. I am Alex, your analytical study assistant. Define the topic we are evaluating today, and let us dissect the facts logically.' }],
    sam: [{ sender: 'buddy', text: 'Hi, Sam here. Ready to run a diagnostics scan on what you think you know? Give me a topic, and let\'s test the logic holes.' }]
  };

  function renderBuddyChat() {
    const container = document.getElementById('chat-history-board');
    container.innerHTML = '';

    const history = chatHistory[activeBuddy] || [];
    history.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = `chat-message ${msg.sender === 'buddy' ? 'buddy' : 'user'}`;
      bubble.textContent = msg.text;
      container.appendChild(bubble);
    });

    // Auto scroll
    container.scrollTop = container.scrollHeight;
  }

  // Buddy card selects
  const buddyCards = document.querySelectorAll('.buddy-select-card');
  buddyCards.forEach(card => {
    card.addEventListener('click', () => {
      buddyCards.forEach(c => c.style.borderColor = 'var(--border-light)');
      card.style.borderColor = 'var(--primary)';
      
      activeBuddy = card.getAttribute('data-buddy');
      
      const capitalizedMap = { emma: 'Emma', alex: 'Alex', sam: 'Sam' };
      document.getElementById('chat-buddy-title').textContent = capitalizedMap[activeBuddy];
      
      renderBuddyChat();
    });
  });

  document.getElementById('btn-chat-send').onclick = async () => {
    const input = document.getElementById('chat-user-message');
    const msgText = input.value.trim();
    const topic = document.getElementById('chat-buddy-topic').value.trim() || 'General';

    if (!msgText) return;

    // Append User Message
    chatHistory[activeBuddy].push({ sender: 'user', text: msgText });
    renderBuddyChat();
    input.value = '';

    // Show indicator
    const buddyStatus = document.getElementById('chat-buddy-status');
    buddyStatus.textContent = 'Thinking...';

    try {
      const response = await StudyAIService.generateStudyBuddyResponse(topic, msgText, activeBuddy, chatHistory[activeBuddy], settings.apiKey);
      chatHistory[activeBuddy].push({ sender: 'buddy', text: response });
      renderBuddyChat();
      
      // Log session
      StudyStore.logSession(2, 'Study Buddy', `Discussions: ${topic} with ${activeBuddy}`);
      refreshStreak();
    } catch (e) {
      alert(`Chatbot failed: ${e.message}`);
    } finally {
      buddyStatus.textContent = 'Ready to chat';
    }
  };

  // Send message on Enter keypress
  document.getElementById('chat-user-message').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-chat-send').click();
    }
  });

  // ==========================================
  // 9. ANALYTICS & LOG PANEL
  // ==========================================
  function renderAnalytics() {
    const stats = StudyStore.getAnalytics();
    const logs = StudyStore.getLogs();

    // Values in elements
    document.getElementById('table-total-time').textContent = `${stats.totalTime} mins`;
    document.getElementById('table-streak').textContent = `${StudyStore.getStreak().count} Days`;
    document.getElementById('table-quizzes').textContent = `${logs.filter(l=>l.type==='Quiz').length} Tests`;
    document.getElementById('table-tasks-completed').textContent = `${logs.filter(l=>l.type==='Study Planner').length} Tasks`;

    // Analytics progress circle (Goal completed vs daily target ratio)
    const goalPercent = Math.min(Math.round((stats.totalTime / (profile.dailyGoal || 25)) * 100), 100);
    document.getElementById('analytics-progress-text').textContent = `${goalPercent}%`;
    
    // Math logic for progress ring (dasharray 377: r=60 => 2*pi*60=377)
    const ring = document.getElementById('analytics-progress-ring');
    const offset = 377 - (goalPercent / 100) * 377;
    ring.style.strokeDashoffset = offset;

    // Set dynamic message
    const msgEl = document.getElementById('analytics-goal-message');
    if (goalPercent >= 100) {
      msgEl.textContent = "Spectacular! You have achieved your daily target focus time. You're building solid study habits.";
    } else {
      msgEl.textContent = `You've completed ${goalPercent}% of your daily ${profile.dailyGoal} mins goal. Use Pomodoro focus blocks to complete your study targets.`;
    }

    // Render Logs Table Rows
    const tbody = document.getElementById('analytics-logs-body');
    tbody.innerHTML = '';

    // Render reverse chronological
    const sortedLogs = [...logs].reverse();
    sortedLogs.forEach(log => {
      const tr = document.createElement('tr');
      
      const badgeClasses = {
        'Pomodoro': 'orange',
        'Quiz': 'pink',
        'Explainer': 'violet',
        'Study Planner': 'cyan',
        'Quiz & Flashcards': 'pink',
        'Study Buddy': 'violet'
      };
      const badgeColor = badgeClasses[log.type] || 'violet';

      tr.innerHTML = `
        <td>${log.date}</td>
        <td>${log.duration} mins</td>
        <td><span class="tag-badge ${badgeColor}">${log.type}</span></td>
        <td>${log.topic}</td>
      `;
      tbody.appendChild(tr);
    });

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center italic text-slate-500">No logs found yet. Start studying!</td></tr>';
    }
  }

  // ==========================================
  // 10. SETTINGS CONTROLLER
  // ==========================================
  document.getElementById('btn-settings-save-profile').onclick = () => {
    const name = document.getElementById('settings-username').value.trim() || 'Future Scholar';
    const level = document.getElementById('settings-level').value;
    const dailyGoal = parseInt(document.getElementById('settings-goal').value) || 25;

    profile.name = name;
    profile.level = level;
    profile.dailyGoal = dailyGoal;

    StudyStore.saveProfile(profile);
    applyThemeAndAccent();
    alert("Profile settings saved successfully!");
  };

  document.getElementById('btn-settings-save-advanced').onclick = () => {
    const key = document.getElementById('settings-api-key').value.trim();
    const theme = document.getElementById('settings-theme').value;
    const accent = document.getElementById('settings-accent').value;

    settings.apiKey = key;
    profile.theme = theme;
    profile.accentColor = accent;

    StudyStore.saveSettings(settings);
    StudyStore.saveProfile(profile);
    applyThemeAndAccent();
    alert("Advanced configuration updated successfully!");
  };

  // ==========================================
  // RUN TIME BOOTSTRAP
  // ==========================================
  applyThemeAndAccent();
  refreshStreak();
  renderDashboard();
  renderBuddyChat();
  updateTimerDisplay();

});
