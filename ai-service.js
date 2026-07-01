// ai-service.js
// Handles calls to the Gemini API (using gemini-1.5-flash) and offers a smart local mock generator fallback.

const StudyAIService = (() => {

  // HELPER: Fetch from Gemini REST endpoint.
  // If a user-provided apiKey exists, calls Google directly.
  // Otherwise, routes through the secure Netlify serverless proxy
  // so the site-owner's key is never exposed in the browser.
  async function callGemini(prompt, apiKey) {
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    let url, fetchOptions;

    if (apiKey) {
      // User has entered their own key in Settings — call Google directly
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      };
    } else {
      // No user key — route through our secure server-side proxy.
      // The real API key lives in Netlify's environment variables, never in this file.
      url = '/api/gemini';
      fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      };
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Gemini API request failed:", error);
      throw error;
    }
  }

  // LOCAL MOCK DATA for offline/no-key usage
  const MOCK_TOPICS = {
    "photosynthesis": {
      explanation: {
        "ELI5": "Imagine plants have tiny solar panels on their leaves! They take in sunlight, water from the soil, and carbon dioxide from the air. Using the energy from the sun, they mix them together to bake their own food (sugar/glucose) and release oxygen for us to breathe. It's like cooking using sunlight!",
        "Analogy": "Photosynthesis is like a **solar-powered kitchen**. The plant leaf is the chef, the **chloroplasts** are the ovens, **sunlight** is the electricity, **carbon dioxide** (air) and **water** (soil) are the raw ingredients. The final baked cake is **glucose** (food), and **oxygen** is the exhaust steam released from the kitchen chimney.",
        "Deep-Dive": "Photosynthesis is a chemical process by which photoautotrophs convert light energy into chemical energy. It occurs inside the **chloroplasts** of plant cells, primarily in the thylakoid membranes and stroma. The process is divided into two main stages:\n\n1. **Light-Dependent Reactions**: Occur in the thylakoids. Chlorophyll absorbs solar radiation, splitting water molecules ($H_2O$) to release oxygen ($O_2$), and generating ATP and NADPH.\n2. **Light-Independent Reactions (Calvin Cycle)**: Occur in the stroma. Carbon dioxide ($CO_2$) is fixed using ATP and NADPH to synthesize glyceraldehyde-3-phosphate (G3P), which forms glucose ($C_6H_{12}O_6$).\n\n**Equation:** $6CO_2 + 6H_2O + \\text{light} \\rightarrow C_6H_{12}O_6 + 6O_2$",
        "Summary": "- Occurs in chloroplasts containing chlorophyll.\n- **Inputs:** Sunlight, Carbon Dioxide, and Water.\n- **Outputs:** Glucose (sugar for plant growth) and Oxygen (released to atmosphere).\n- Key stages: Light-dependent reactions (splitting water) and Calvin Cycle (fixing CO2)."
      },
      quiz: [
        { question: "What pigment absorbs sunlight during photosynthesis?", options: ["Carotenoid", "Chlorophyll", "Hemoglobin", "Xanthophyll"], answer: "Chlorophyll" },
        { question: "Where do the light-independent reactions (Calvin Cycle) take place?", options: ["Mitochondria", "Thylakoid Membrane", "Stroma", "Cell Wall"], answer: "Stroma" },
        { question: "Which of the following is a main product of photosynthesis?", options: ["Carbon Dioxide", "Nitrogen", "Glucose", "Methane"], answer: "Glucose" }
      ],
      flashcards: [
        { question: "What is the chemical formula of Glucose?", answer: "C6H12O6" },
        { question: "What is split during the light-dependent reactions to release oxygen?", answer: "Water molecules (H2O)" },
        { question: "Which cellular organelle is responsible for hosting photosynthesis?", answer: "The Chloroplast" }
      ],
      planner: [
        "Read Chapter on Chloroplast structure and pigment absorption spectra.",
        "Draw and label the Light-Dependent Reactions diagram.",
        "Write out the full chemical equation of photosynthesis and balance it.",
        "Compare and contrast C3, C4, and CAM plant photosynthesis variations."
      ]
    },
    "newton's laws": {
      explanation: {
        "ELI5": "Isaac Newton figured out three rules about how things move:\n1. **First Law:** Stuff is lazy. Things that are sitting still won't move, and things moving won't stop, unless something else pushes or pulls them.\n2. **Second Law:** Pushing something harder makes it speed up faster. Pushing a heavy object is harder than pushing a light one.\n3. **Third Law:** If you push something, it pushes back on you just as hard! Like when you release a balloon, the air shoots down and the balloon flies up.",
        "Analogy": "Think of **Inertia** (First Law) as a teenager in bed: they won't get up unless forced by an alarm clock. Think of the **Second Law** ($F=ma$) as kicking a soccer ball vs kicking a heavy bowling ball: the same kick (force) makes the lighter ball fly far (high acceleration) but hurts your foot on the heavy ball (mass). The **Third Law** is like jumping off a skateboard: you push the skateboard backwards, and it pushes you forwards.",
        "Deep-Dive": "Sir Isaac Newton's three laws of motion formulate the foundation of classical mechanics:\n\n1. **First Law (Law of Inertia):** An object remains at rest or continues to move at a constant velocity in a straight line unless acted upon by a net external force.\n2. **Second Law ($F=ma$):** The vector sum of the external forces $F$ on an object is equal to the mass $m$ of that object multiplied by the acceleration vector $a$ of the object. Hence, acceleration is proportional to net force and inversely proportional to mass.\n3. **Third Law (Action & Reaction):** When one body exerts a force on a second body, the second body simultaneously exerts a force equal in magnitude and opposite in direction on the first body ($F_{A\\text{ on }B} = -F_{B\\text{ on }A}$).",
        "Summary": "- **First Law (Inertia):** Objects resist changes in their state of motion.\n- **Second Law ($F=ma$):** Force equals mass times acceleration.\n- **Third Law (Action/Reaction):** All forces occur in matched, opposite pairs."
      },
      quiz: [
        { question: "Which law explains why you slide forward when a car brakes suddenly?", options: ["First Law (Inertia)", "Second Law (F=ma)", "Third Law (Action/Reaction)", "Law of Gravitation"], answer: "First Law (Inertia)" },
        { question: "If you double the force on an object, what happens to its acceleration?", options: ["It is cut in half", "It stays the same", "It doubles", "It quadruples"], answer: "It doubles" },
        { question: "A rocket launches by expelling gas downwards. This is an example of which law?", options: ["First Law", "Second Law", "Third Law", "None"], answer: "Third Law" }
      ],
      flashcards: [
        { question: "What is the formula representing Newton's Second Law?", answer: "Force = Mass x Acceleration (F = ma)" },
        { question: "What is inertia?", answer: "The resistance of any physical object to any change in its velocity." },
        { question: "What unit is force measured in?", answer: "Newtons (N), which equals kg·m/s²" }
      ],
      planner: [
        "Review vector addition and net force calculations.",
        "Complete 5 practice problems calculating acceleration using F=ma.",
        "Set up a simple home physics experiment testing action/reaction (e.g. balloon rocket).",
        "Summarize how friction affects Newton's First Law in real-world scenarios."
      ]
    },
    "python programming": {
      explanation: {
        "ELI5": "Python is a computer language that reads almost like plain English. It is a set of instructions we give to a computer. Instead of writing complicated codes, Python lets us say things like `print('Hello')` or `if score > 10: print('You win!')`. It is perfect for beginners because it doesn't have a lot of confusing symbols.",
        "Analogy": "Writing Python is like writing a **recipe** for a kitchen robot. You write simple, step-by-step instructions. Variables are like **labeled jars** storing sugar or salt. Functions are like **appliances** (e.g., a blender: you put ingredients in, it blends them, and gives you a smoothie back). Indentation (spaces) is how you tell the robot which ingredients belong inside which recipe step.",
        "Deep-Dive": "Python is an interpreted, high-level, general-purpose programming language. It emphasizes code readability with its notable use of significant whitespace/indentation. Key features include:\n- **Dynamically Typed:** Variables do not need explicit declaration before use.\n- **Multi-paradigm:** Supports Object-Oriented, Procedural, and Functional programming styles.\n- **Automatic Memory Management:** Features built-in garbage collection.\n- Common data structures include: Lists (`[]`), Dictionaries (`{}`), Tuples (`()`), and Sets.",
        "Summary": "- High-level, general-purpose language designed for readability.\n- Relies on indentation (whitespace) to define code blocks.\n- Widely used in Web Development, Data Science, AI, and Automation.\n- Interpreted language, meaning code is executed line-by-line."
      },
      quiz: [
        { question: "Which data type in Python is ordered, mutable, and allows duplicate elements?", options: ["Tuple", "Set", "Dictionary", "List"], answer: "List" },
        { question: "How do you define a function in Python?", options: ["function myFunc():", "def myFunc():", "void myFunc()", "define myFunc:"], answer: "def myFunc():" },
        { question: "What does the code `print(2 ** 3)` output?", options: ["6", "8", "9", "5"], answer: "8" }
      ],
      flashcards: [
        { question: "What is the difference between a list and a tuple?", answer: "Lists are mutable (can be changed), whereas Tuples are immutable (cannot be changed once created)." },
        { question: "What keyword is used to create a loop that iterates over a sequence?", answer: "The 'for' keyword (e.g., 'for item in list:')" },
        { question: "What does the method '.append()' do to a list?", answer: "It adds an item to the end of the list." }
      ],
      planner: [
        "Install Python and run a 'Hello World' script in the terminal.",
        "Practice using variables, conditional statements (if/elif/else), and loops.",
        "Build a simple text-based calculator program in Python.",
        "Learn about lists, dictionaries, and write functions to manipulate them."
      ]
    }
  };

  // Helper for generic fallback generation when a topic is not in the presets
  function getGenericFallback(topic) {
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    return {
      explanation: {
        "ELI5": `Imagine ${capitalizedTopic} is like a game where you follow rules step-by-step. It helps us understand how things connect together, like sorting building blocks!`,
        "Analogy": `${capitalizedTopic} is like a **Swiss Army Knife**. It has many parts, each designed for a specific task. Individually they are simple, but together they can solve complex problems in their field.`,
        "Deep-Dive": `${capitalizedTopic} refers to a core academic subject area. In research and practice, it represents a foundational block involving processes, applications, and frameworks. In-depth study requires analyzing its history, experimental parameters, and practical models.\n\nKey theories in ${capitalizedTopic} often address underlying factors, variables, and systemic reactions that form the baseline of modern educational literature.`,
        "Summary": `- Essential concept in its scientific or academic field.\n- Composed of distinct, interconnected components.\n- Serves as a foundation for advanced reasoning.\n- Has multiple practical applications in everyday scenarios.`
      },
      quiz: [
        { question: `Which of the following best describes the core concept of ${capitalizedTopic}?`, options: [`An interactive process`, `A static element`, `A temporary state`, `A fictional occurrence`], answer: `An interactive process` },
        { question: `What is a primary goal of studying ${capitalizedTopic}?`, options: [`To ignore dependencies`, `To understand systems and solve related problems`, `To avoid calculations`, `To replace all other subjects`], answer: `To understand systems and solve related problems` },
        { question: `In what context is ${capitalizedTopic} most frequently applied?`, options: [`Artistic only`, `Scientific and analytical contexts`, `Farming only`, `None of the above`], answer: `Scientific and analytical contexts` }
      ],
      flashcards: [
        { question: `Define ${capitalizedTopic} in one sentence.`, answer: `A key academic concept or framework used to structure logic and solve specific domain problems.` },
        { question: `What is the most common misconception about ${capitalizedTopic}?`, answer: `That it is highly isolated, whereas it actually connects deeply to surrounding subjects.` },
        { question: `What is the first step in analyzing ${capitalizedTopic}?`, answer: `Identifying the core parameters, inputs, and systemic constraints.` }
      ],
      planner: [
        `Search for introductory materials on ${capitalizedTopic}.`,
        `Draft a glossary of 5 key terms related to ${capitalizedTopic}.`,
        `Complete a practice assignment or quiz on the fundamentals.`,
        `Write a short summary explaining how ${capitalizedTopic} applies in real life.`
      ]
    };
  }

  // PUBLIC API
  return {
    // Generate Explanation
    async generateExplanation(topic, style, apiKey) {
      const cleanTopic = topic.toLowerCase().trim();

      // Always attempt Gemini (proxy for no-key visitors, direct for users with own key)
      const prompt = `You are a world-class AI Study Coach. Please explain the topic "${topic}" in style "${style}". 
        The options for style are:
        - "ELI5": Explain like I'm 5 years old. Use simple language, short sentences, and child-friendly metaphors.
        - "Analogy": Use a strong, elaborate real-life analogy or story to clarify the concept.
        - "Deep-Dive": Provide a thorough, academic, detailed explanation with formulas, structures, and historical context if applicable.
        - "Summary": Provide a clean bulleted summary of key takeaways.
        
        Respond in clean HTML (wrap in a <div>, do NOT include <html> or <body> tags). Use headings (<h3>), bold text (<strong>), lists (<ul>/<li>), or italic tags for styling. Do not write markdown markers around it. Just HTML.`;

      try {
        let htmlOutput = await callGemini(prompt, apiKey);
        htmlOutput = htmlOutput.replace(/^```html\s*/i, '').replace(/```$/, '').trim();
        return htmlOutput;
      } catch (err) {
        console.error("Gemini failed, falling back to local simulation.", err);
      }

      // Local Fallback simulation
      await new Promise(r => setTimeout(r, 1200)); // Simulate delay
      const data = MOCK_TOPICS[cleanTopic] || getGenericFallback(topic);
      const explanationText = data.explanation[style] || data.explanation["Summary"];
      
      // Convert standard text/markdown to simple HTML format
      let formattedHtml = explanationText
        .replace(/\n\n/g, '</p><p class="mt-3">')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\$(.*?)\$/g, '<code>$1</code>');
      
      return `<div><h3 class="text-xl font-semibold mb-3 text-purple-400 capitalize">${style} Explanation: ${topic}</h3><p>${formattedHtml}</p></div>`;
    },

    // Generate Study Plan
    async generateStudyPlan(subject, days, hours, apiKey) {
      // Always attempt Gemini (proxy for no-key visitors, direct for users with own key)
      const prompt = `You are a world-class AI Study Coach. Generate a personalized, day-by-day study plan checklist for learning the subject "${subject}" in exactly ${days} days, studying ${hours} hours per day. 
        Provide the output as a JSON list of tasks, for example:
        [
          "Day 1: Read introduction and terminology of ${subject}",
          "Day 1: Solve 5 basic exercises",
          "Day 2: Study intermediate concepts of ${subject}",
          "Day 3: Write a summary and take a mock test"
        ]
        Provide ONLY valid JSON (no surrounding markdown, no extra explanation text, just the raw JSON array).`;

      try {
        const rawText = await callGemini(prompt, apiKey);
        const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonText);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {
        console.error("Gemini study plan failed, falling back.", err);
      }

      // Local Fallback simulation
      await new Promise(r => setTimeout(r, 1000));
      const cleanSubject = subject.toLowerCase().trim();
      const topicData = MOCK_TOPICS[cleanSubject] || getGenericFallback(subject);
      
      // Construct a checklist based on the mock data
      const baseTasks = topicData.planner;
      const finalTasks = [];
      const numTasksPerDay = Math.ceil(baseTasks.length / days) || 1;
      
      let dayCounter = 1;
      baseTasks.forEach((task, idx) => {
        if (idx > 0 && idx % numTasksPerDay === 0 && dayCounter < days) {
          dayCounter++;
        }
        finalTasks.push(`Day ${dayCounter}: ${task} (Estimated time: ${hours} hours)`);
      });

      // Pad tasks if there are fewer tasks than days
      while (finalTasks.length < days) {
        const d = finalTasks.length + 1;
        finalTasks.push(`Day ${d}: Review notes and self-test on ${subject}`);
      }

      return finalTasks;
    },

    // Generate Quizzes & Flashcards
    async generateQuizAndFlashcards(topic, apiKey) {
      // Always attempt Gemini (proxy for no-key visitors, direct for users with own key)
      const prompt = `You are a world-class AI Study Coach. Generate a mini-quiz and a flashcard deck on the topic "${topic}".
        Format the response as a single valid JSON object containing exactly two arrays: "quiz" and "flashcards".
        
        Structure:
        {
          "quiz": [
            {
              "question": "A multiple choice question?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "answer": "Option B"
            }
          ],
          "flashcards": [
            {
              "question": "Question for the flashcard?",
              "answer": "Concise answer for the back of the flashcard."
            }
          ]
        }

        Generate exactly 3 quiz questions (MCQs) and 3 flashcards.
        Provide ONLY valid JSON. No markdown backticks, no text before or after the JSON.`;

      try {
        const rawText = await callGemini(prompt, apiKey);
        const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonText);
        if (parsed.quiz && parsed.flashcards) {
          return parsed;
        }
      } catch (err) {
        console.error("Gemini Quiz/Flashcard generation failed, falling back.", err);
      }

      // Local Fallback simulation
      await new Promise(r => setTimeout(r, 1500));
      const cleanTopic = topic.toLowerCase().trim();
      const topicData = MOCK_TOPICS[cleanTopic] || getGenericFallback(topic);
      
      return {
        quiz: topicData.quiz,
        flashcards: topicData.flashcards
      };
    },

    // Study Buddy Simulator Chat Response
    async generateStudyBuddyResponse(topic, message, persona, chatHistory, apiKey) {
      const systemPrompts = {
        emma: "You are Emma, a friendly and positive virtual Study Buddy. You use emojis, encourage the student, congratulate them on hard work, and explain concepts simply.",
        alex: "You are Alex, an analytical and precise virtual Study Buddy. You speak logically, question the student's assumptions, provide strict mathematical or logical definitions, and challenge them to be precise.",
        sam: "You are Sam, a skeptical virtual Study Buddy who plays devil's advocate. You help the student see logical flaws, point out exceptions, and ask probing questions like 'but is that always true?' or 'how would you prove that?'"
      };

      const systemPrompt = systemPrompts[persona] || systemPrompts.emma;

      // Always attempt Gemini (proxy for no-key visitors, direct for users with own key)
      const formattedHistory = chatHistory.map(msg => `${msg.sender === 'user' ? 'Student' : 'Study Buddy'}: ${msg.text}`).join('\n');
      const prompt = `${systemPrompt}
        We are studying the topic: "${topic}".
        
        Recent chat history:
        ${formattedHistory}
        
        Student's new message: "${message}"
        
        Respond naturally as this persona. Keep your response concise (1-3 paragraphs max) and conversational.`;

      try {
        return await callGemini(prompt, apiKey);
      } catch (err) {
        console.error("Gemini Study Buddy failed, falling back.", err);
      }

      // Local Fallback responses based on persona
      await new Promise(r => setTimeout(r, 800));
      const cleanTopic = topic.toLowerCase();
      
      const responses = {
        emma: [
          `Wow, that is a super interesting way to look at ${topic}! 🌟 I really like how you expressed that. Keep going, you're doing amazing! What part should we study next?`,
          `I totally agree with that point about ${topic}! It took me a while to understand it too, but you've got it down! Let's do a quick quiz together to celebrate? 🎉`,
          `No worries at all, learning ${topic} can be tough! But you're putting in the work and that's what counts. Let's break it down into a simpler analogy together! 🚀`
        ],
        alex: [
          `Analyzing your statement on ${topic}, we must define our parameters. Let's look at the quantitative evidence. What are the variables at play here?`,
          `That is a logical hypothesis, but mathematically or structurally, there is a constraint. If we test this statement under general conditions, does it hold true?`,
          `Let's break ${topic} down to its fundamental components. If we look at the first principles, we can deduce the outcome. What is your primary assumption?`
        ],
        sam: [
          `Hmm, are you sure about that? For ${topic}, that sounds like a generalization. What about cases where the conditions are inverted?`,
          `I'm playing devil's advocate here: how would you prove that definition to someone who completely disagrees with you? What is your counterargument?`,
          `That works in theory, but in practice, things are rarely that clean. How does that concept account for external disturbances or real-world noise?`
        ]
      };

      const personaResponses = responses[persona] || responses.emma;
      const randomIndex = Math.floor(Math.random() * personaResponses.length);
      return personaResponses[randomIndex];
    }
  };
})();

// Export globally
window.StudyAIService = StudyAIService;
