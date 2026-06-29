// data-store.js
// Handles localStorage persistence for user progress, schedules, focus logs, and SRS flashcards.

const StudyStore = (() => {
  const KEYS = {
    PROFILE: 'studymate_profile',
    STREAK: 'studymate_streak',
    PLANS: 'studymate_plans',
    LOGS: 'studymate_logs',
    FLASHCARDS: 'studymate_flashcards',
    SETTINGS: 'studymate_settings'
  };

  // Helper to get from localstorage with fallback
  const getJson = (key, fallback) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage`, e);
      return fallback;
    }
  };

  // Helper to save to localstorage
  const saveJson = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage`, e);
    }
  };

  // Initial dummy flashcards to ensure there is content out of the box
  const DEFAULT_FLASHCARDS = [
    { id: 'fc_1', subject: 'Physics', question: 'What is Newton\'s First Law of Motion?', answer: 'An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.', box: 1, nextReview: Date.now() },
    { id: 'fc_2', subject: 'Chemistry', question: 'What is an atomic number?', answer: 'The number of protons found in the nucleus of an atom, which determines its chemical properties and place in the periodic table.', box: 1, nextReview: Date.now() },
    { id: 'fc_3', subject: 'Computer Science', question: 'What is the complexity of binary search?', answer: 'O(log n) time complexity, because it divides the search interval in half at each step.', box: 1, nextReview: Date.now() },
    { id: 'fc_4', subject: 'Biology', question: 'What is the function of mitochondria?', answer: 'Known as the powerhouse of the cell, it generates most of the cell\'s chemical energy in the form of ATP.', box: 1, nextReview: Date.now() }
  ];

  return {
    // PROFILE
    getProfile() {
      return getJson(KEYS.PROFILE, {
        name: 'Future Scholar',
        level: 'College', // School, College, Competitive, Self-Learner
        dailyGoal: 25, // minutes
        theme: 'dark',
        accentColor: '#8b5cf6' // Indigo purple
      });
    },
    saveProfile(profile) {
      saveJson(KEYS.PROFILE, profile);
    },

    // SETTINGS (API Keys, etc.)
    getSettings() {
      return getJson(KEYS.SETTINGS, {
        apiKey: ''
      });
    },
    saveSettings(settings) {
      saveJson(KEYS.SETTINGS, settings);
    },

    // STREAK MANAGEMENT
    getStreak() {
      const streakData = getJson(KEYS.STREAK, {
        count: 0,
        lastActiveDate: null
      });

      // Automatically check and update streak
      const today = new Date().toDateString();
      if (streakData.lastActiveDate) {
        const lastDate = new Date(streakData.lastActiveDate);
        const diffTime = Math.abs(new Date(today) - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          // Streak broken
          streakData.count = 0;
        }
      }
      return streakData;
    },
    updateStreak() {
      const streakData = this.getStreak();
      const today = new Date().toDateString();

      if (streakData.lastActiveDate !== today) {
        streakData.count += 1;
        streakData.lastActiveDate = today;
        saveJson(KEYS.STREAK, streakData);
      }
      return streakData;
    },

    // STUDY PLANS
    getStudyPlans() {
      return getJson(KEYS.PLANS, []);
    },
    saveStudyPlans(plans) {
      saveJson(KEYS.PLANS, plans);
    },
    addStudyPlan(subject, durationDays, dailyHours, tasks) {
      const plans = this.getStudyPlans();
      const newPlan = {
        id: 'plan_' + Date.now(),
        subject,
        durationDays,
        dailyHours,
        createdAt: new Date().toLocaleDateString(),
        tasks: tasks.map((taskText, idx) => ({
          id: `task_${idx}_${Date.now()}`,
          text: taskText,
          completed: false,
          day: Math.floor(idx / 2) + 1 // Spread tasks over days
        }))
      };
      plans.push(newPlan);
      this.saveStudyPlans(plans);
      return newPlan;
    },
    toggleTask(planId, taskId) {
      const plans = this.getStudyPlans();
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        const task = plan.tasks.find(t => t.id === taskId);
        if (task) {
          task.completed = !task.completed;
          this.saveStudyPlans(plans);
          // If task completed, trigger streak/log update
          if (task.completed) {
            this.updateStreak();
          }
        }
      }
      return plans;
    },
    deleteStudyPlan(planId) {
      let plans = this.getStudyPlans();
      plans = plans.filter(p => p.id !== planId);
      this.saveStudyPlans(plans);
      return plans;
    },

    // STUDY LOGS / ANALYTICS
    getLogs() {
      return getJson(KEYS.LOGS, [
        // Dummy default data to display on start
        { id: 'log_d1', date: new Date(Date.now() - 3 * 24 * 3600000).toDateString(), duration: 25, type: 'Pomodoro', topic: 'Physics Newton\'s Laws' },
        { id: 'log_d2', date: new Date(Date.now() - 2 * 24 * 3600000).toDateString(), duration: 40, type: 'Study Planner', topic: 'React Components Review' },
        { id: 'log_d3', date: new Date(Date.now() - 1 * 24 * 3600000).toDateString(), duration: 15, type: 'Quiz & Flashcards', topic: 'Biology Mitochondria' }
      ]);
    },
    logSession(duration, type, topic) {
      const logs = this.getLogs();
      const newLog = {
        id: 'log_' + Date.now(),
        date: new Date().toDateString(),
        timestamp: Date.now(),
        duration, // in minutes
        type, // 'Pomodoro', 'Quiz', 'Explainer', 'Study Planner'
        topic
      };
      logs.push(newLog);
      saveJson(KEYS.LOGS, logs);
      this.updateStreak();
      return newLog;
    },
    getAnalytics() {
      const logs = this.getLogs();
      const plans = this.getStudyPlans();
      
      // Calculate stats
      const totalTime = logs.reduce((sum, log) => sum + log.duration, 0);
      
      // Quiz correctness (simulated tracking through logs of type Quiz)
      const quizLogs = logs.filter(log => log.type === 'Quiz');
      let totalQuizzes = quizLogs.length;
      let averageScore = totalQuizzes > 0 ? 82 : 0; // standard fallback base
      
      // Study Plan tasks completion rate
      let totalTasks = 0;
      let completedTasks = 0;
      plans.forEach(plan => {
        plan.tasks.forEach(t => {
          totalTasks++;
          if (t.completed) completedTasks++;
        });
      });
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Group logs by past 7 days for the chart
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toDateString();
        const shortDay = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        const minutes = logs
          .filter(log => new Date(log.date).toDateString() === dayStr)
          .reduce((sum, log) => sum + log.duration, 0);
          
        chartData.push({ day: shortDay, minutes });
      }

      return {
        totalTime,
        completionRate,
        averageScore,
        chartData
      };
    },

    // SPACED REPETITION (SRS) FLASHCARDS
    getFlashcards() {
      return getJson(KEYS.FLASHCARDS, DEFAULT_FLASHCARDS);
    },
    saveFlashcards(cards) {
      saveJson(KEYS.FLASHCARDS, cards);
    },
    addFlashcard(subject, question, answer) {
      const cards = this.getFlashcards();
      const newCard = {
        id: 'fc_' + Date.now(),
        subject,
        question,
        answer,
        box: 1, // Leitner box 1, 2, or 3
        nextReview: Date.now() // review immediately
      };
      cards.push(newCard);
      this.saveFlashcards(cards);
      return newCard;
    },
    // Update Leitner box based on user feedback:
    // 'easy' -> moves up a box (max 3), delays review time
    // 'hard' -> stays in current box or returns to 1, delays slightly
    // 'again' -> resets to box 1, reviews immediately
    reviewFlashcard(cardId, feedback) {
      const cards = this.getFlashcards();
      const card = cards.find(c => c.id === cardId);
      if (card) {
        const now = Date.now();
        if (feedback === 'easy') {
          card.box = Math.min(card.box + 1, 3);
        } else if (feedback === 'again') {
          card.box = 1;
        } // 'hard' keeps same box
        
        // Leitner box delays: Box 1 = 1 min, Box 2 = 10 min, Box 3 = 1 day (simplified for testing/classroom)
        const delayHours = card.box === 1 ? 0.02 : card.box === 2 ? 0.16 : 24; // in hours
        card.nextReview = now + Math.round(delayHours * 60 * 60 * 1000);
        
        this.saveFlashcards(cards);
      }
      return cards;
    },
    getDueFlashcards() {
      const cards = this.getFlashcards();
      const now = Date.now();
      return cards.filter(c => c.nextReview <= now);
    }
  };
})();

// Export globally so it can be included via script tag in index.html
window.StudyStore = StudyStore;
