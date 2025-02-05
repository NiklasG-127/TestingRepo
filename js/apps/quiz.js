// quiz.js

// Token aus dem Session Storage abrufen und Socket.IO verbinden
const token = sessionStorage.getItem('token');
const socket = io.connect('https://testingbackendrepo.onrender.com/quizAPI', { query: { token } });

// DOM-Elemente für die Lobby- und Raumansichten
const lobbyView = document.getElementById('lobby-view');
const roomView = document.getElementById('room-view');
const roomTitle = document.getElementById('room-title');
const roomListElem = document.querySelector('.room-list');

// Elemente des "Raum erstellen"-Formulars in der Lobby
const roomNameInput = document.getElementById('roomName');
const categoryInput = document.getElementById('category');
const questionCountInput = document.getElementById('questionCount');
const createRoomForm = document.querySelector('.form-create-room');

// Element des "Quiz Starten"-Buttons in der Raum-Ansicht
const startQuizBtn = document.getElementById('start-quiz');

// Anzeigeelemente für Fragen, Antworten und Punktestand
const questionDisplay = document.getElementById('question-display');
const answerDisplay = document.getElementById('answer-display');
const scoreDisplay = document.getElementById('score-display');

// Globale Variablen, um Quiz-Parameter zu speichern (wird beim Raum-Erstellen gesetzt)
let roomCategory = null;
let roomQuestionCount = null;

/**
 * Lobby: Raum erstellen und beitreten
 * Hier werden der Raumname, die Kategorie und die Anzahl der Fragen ausgelesen und
 * zusammen mit dem Token an das Backend per "enterRoom"-Event gesendet.
 */
createRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const roomName = roomNameInput.value.trim();
    const category = categoryInput.value.trim();
    const questionCount = questionCountInput.value.trim();

    if (!roomName || !category || !questionCount) return;

    // Speichere die Quiz-Parameter global, damit sie später für den Start genutzt werden können
    roomCategory = category;
    roomQuestionCount = questionCount;

    // Sende alle Daten an das Backend: Raum, Token, Kategorie und Frageanzahl
    socket.emit('enterRoom', {
        room: roomName,
        token: token,
        category: category,
        questionCount: questionCount
    });

    // Optional: Formularfelder leeren
    roomNameInput.value = '';
    categoryInput.value = '';
    questionCountInput.value = '';

    // Wechsel zur Raum-Ansicht: Lobby ausblenden, Raum anzeigen
    lobbyView.classList.add('d-none');
    roomView.classList.remove('d-none');
    roomTitle.textContent = `Raum: ${roomName}`;
});

// Raum-Ansicht: Quiz starten
startQuizBtn.addEventListener('click', () => {
    if (roomCategory && roomQuestionCount) {
        socket.emit('startQuiz', {
            category: roomCategory,
            questionCount: roomQuestionCount
        });
    } else {
        alert('Quiz-Parameter fehlen!');
    }
});

// Aktualisiere die Liste aktiver Räume, wenn der Server ein Update sendet
socket.on('roomList', ({ rooms }) => {
    roomListElem.textContent = '';
    if (rooms && rooms.length > 0) {
        roomListElem.innerHTML = `<em>${rooms.join(', ')}</em>`;
    } else {
        roomListElem.textContent = 'Keine aktiven Räume vorhanden.';
    }
});

// Empfang der Frage vom Server und Anzeige in der Raum-Ansicht
socket.on('question', (data) => {
    const { question_id, question } = data;
    if (questionDisplay) {
        questionDisplay.textContent = `Frage: ${question}`;
    }
    // Sobald eine Frage empfangen wurde, nach den Antwortmöglichkeiten fragen
    if (question_id !== undefined) {
        socket.emit('askForAnswers', { question_id });
    }
});

// Anzeige der Antwortmöglichkeiten als Buttons
socket.on('answers', (data) => {
    if (answerDisplay) {
        answerDisplay.innerHTML = '';
        data.forEach(answer => {
            const answerBtn = document.createElement('button');
            answerBtn.textContent = answer.answer;
            answerBtn.classList.add('btn', 'btn-outline-primary', 'm-1');
            answerBtn.setAttribute('data-answer-id', answer.answer_id);
            answerBtn.setAttribute('data-question-id', answer.question_id);
            answerBtn.addEventListener('click', () => {
                socket.emit('submitAnswer', {
                    playerAnswer: answer.answer_id,
                    question_id: answer.question_id
                });
            });
            answerDisplay.appendChild(answerBtn);
        });
    }
});

// Empfang der ausgewerteten Antwort (Richtig/Falsch) und Aktualisierung des Scores
socket.on('evaluatedAnswer', (data) => {
    // data enthält { correct, message, score }
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${data.score}`;
    }
    // Der Server steuert den Ablauf und löst "nextQuestion" aus, wenn alle geantwortet haben.
});

// Anzeige, wenn das Quiz beendet ist – Übersicht der Scores
socket.on('quizOver', (data) => {
    if (scoreDisplay) {
        scoreDisplay.innerHTML = '<h3>Quiz beendet!</h3>';
        data.forEach(userScore => {
            const scoreElem = document.createElement('div');
            scoreElem.textContent = `Name: ${userScore.name} - Score: ${userScore.score}`;
            scoreDisplay.appendChild(scoreElem);
        });
    }
});

// Empfang von allgemeinen Nachrichten (z. B. vom Admin) – hier einfach in der Konsole protokolliert
socket.on('message', (data) => {
    console.log(`[${data.time}] ${data.name}: ${data.text}`);
});

// Bei Token-Fehler: Weiterleitung zurück zur Login-/Startseite
socket.on('failedToken', () => {
    window.location.href = '../index.html';
});
