const token = sessionStorage.getItem('token');
const socket = io.connect('https://testingbackendrepo.onrender.com/quizAPI', {
    query: {token}
});

//DOM-Elemente für Lobby und Raum
const lobbyView = document.getElementById('lobby-view');
const roomView = document.getElementById('room-view');
const roomTitle = document.getElementById('room-title');
/*const roomListElement = document.querySelector('.room-list');*/

//Elemente fürs Raumerstellen formular in Lobby
const roomNameInput = document.getElementById('roomName')
const categoryInput = document.getElementById('category');
const questionCountInput = document.getElementById('questionCount');
const createRoomForm = document.querySelector('.form-create-room');

//Element des 'Quiz Starten' Button in Raum view
const startQuizBtn = document.getElementById('start-quiz');

// Anzeigeelemente für Fragen, Antworten und Punktestand
const questionDisplay = document.getElementById('question-display');
const answerDisplay = document.getElementById('answer-display');
const scoreDisplay = document.getElementById('score-display');

// DOM-Elemente für den Chat im Raum
const msgForm = document.querySelector('.form-msg');
const msgInput = document.getElementById('message');
const chatDisplay = document.querySelector('.chat-display');

// const chatRoom = document.querySelector('#room');
// const activity = document.querySelector('.activity');
// const usersList = document.querySelector('.user-list');
const roomList = document.querySelector('.room-list');
// const chatDisplay = document.querySelector('.chat-display');
//
// const categoryInput = document.querySelector('#category');
// const questionCountInput = document.querySelector('#questionCount');


//Create Room
createRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const roomName = roomNameInput.value.trim();
    const category = categoryInput.value.trim();
    const questionCount = questionCountInput.value.trim();

    if (!roomName || !category || !questionCount) return;

    // Sende alle Daten an das Backend: Raum, Token, Kategorie und Frageanzahl
    socket.emit('enterRoom', {
        room: roomName,
        token: token,
        category: category,
        questionCount: questionCount
    });

    // Formularfelder leeren
    roomNameInput.value = '';
    categoryInput.value = '';
    questionCountInput.value = '';

    // Wechsel zur Raum-Ansicht: Lobby ausblenden, Raum anzeigen
    lobbyView.classList.add('d-none');
    roomView.classList.remove('d-none');
    roomTitle.textContent = `Raum: ${roomName}`;
});


function sendMessage(e) {
    e.preventDefault();
    if (getUsernameFromToken() && msgInput.value) {
        socket.emit('message', {
            name: getUsernameFromToken(),
            text: msgInput.value
        });
        msgInput.value = "";
    }
    msgInput.focus();
}


//Start Quiz
startQuizBtn.addEventListener('click', () => {
    socket.emit('startQuiz');
    });


function enterRoom(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('token');
    if (roomNameInput.value) {
        socket.emit('enterRoom', {
            room: roomNameInput.value,
            token: token
        });
    }
}

document.querySelector('.form-msg')
    .addEventListener('submit', sendMessage);
document.querySelector('.form-join')
    .addEventListener('submit', enterRoom);

msgInput.addEventListener('keypress', () => {
    const username = getUsernameFromToken();
    if (username) {
        socket.emit('activity', username);
    }
});


// Listen for messages
socket.on("message", (data) => {
    activity.textContent = "";
    const { name, text, time } = data;
    const li = document.createElement('li');
    li.className = 'post';
    if (name === getUsernameFromToken()) li.className = 'post post--left';
    if (name !== getUsernameFromToken() && name !== 'Admin') li.className = 'post post--right';
    if (name !== 'Admin') {
        li.innerHTML = `<div class="post__header ${name === getUsernameFromToken()
            ? 'post__header--user'
            : 'post__header--reply'
        }">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
        </div>
        <div class="post__text">${text}</div>`;
    } else {
        li.innerHTML = `<div class="post__text">${text}</div>`;
    }
    document.querySelector('.chat-display').appendChild(li);

    chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

let activityTimer;
socket.on("activity", (name) => {
    activity.textContent = `${name} is typing...`;

    // Clear after 3 seconds
    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        activity.textContent = "";
    }, 3000);
});

// User- und Raum-Listen aktualisieren
socket.on('userList', ({ users }) => {
    showUsers(users);
});

socket.on('roomList', ({ rooms }) => {
    showRooms(rooms);
});

function showUsers(users) {
    usersList.textContent = '';
    if (users) {
        usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
        users.forEach((user, i) => {
            usersList.textContent += ` ${user.name}`;
            if (users.length > 1 && i !== users.length - 1) {
                usersList.textContent += ",";
            }
        });
    }
}

function showRooms(rooms) {
    roomList.textContent = '';
    if (rooms) {
        roomList.innerHTML = '<em>Active Rooms:</em>';
        rooms.forEach((room, i) => {
            roomList.textContent += ` ${room}`;
            if (rooms.length > 1 && i !== rooms.length - 1) {
                roomList.textContent += ",";
            }
        });
    }
}

socket.on('question', (data)=> {
    const {question_id, question} = data
    console.log(data)
    const questionDisplay = document.getElementById('question-display')
    if(questionDisplay){
        questionDisplay.textContent = '';
        questionDisplay.textContent = `Frage: ${question}`
    }
    if (question_id !== undefined) {
        socket.emit('askForAnswers', { question_id });
    } else {
        console.log('question_id ist undefined');
    }
})

socket.on('answers', (data) => {
    console.log('Client: Antworten:', data)
    const answerDisplay = document.getElementById('answer-display')
    if (answerDisplay) {
        // Alle Antworten anzeigen
        answerDisplay.innerHTML = ''
        data.forEach(answer => {
            const answerElement = document.createElement('button')
            answerElement.textContent = `Antwort: ${answer.answer}`
            answerElement.setAttribute('data-answer-id', answer.answer_id)
            answerElement.setAttribute('data-question-id', answer.question_id)
            answerElement.addEventListener('click', (event) => {
                const playerAnswer = event.target.getAttribute('data-answer-id');
                const question_id = event.target.getAttribute('data-question-id');
                console.log('Antwort-ID:', playerAnswer, 'Frage-ID:', question_id); // Logge die IDs
                socket.emit('submitAnswer', { playerAnswer, question_id });
            })

            answerDisplay.appendChild(answerElement)
        })
    }
})

socket.on('evaluatedAnswer', (data)=>{
    console.log('Ev Antwort:', data)
    const{ correct, message, score } =data
    //Prototype
    socket.emit('nextQuestion')
})


socket.on('quizOver', (data) => {
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) {
        data.forEach(u => {
            const scoreElement = document.createElement('div');
            scoreElement.textContent = `Name: ${u.name} Score: ${u.score}`;
            scoreDisplay.appendChild(scoreElement);
        });
    }
});
//Test Comment
socket.on('failedToken', ()=>{
    window.location.href = '../index.html';
})


function getUsernameFromToken() {
    const token = sessionStorage.getItem('token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1])); // Dekodiere den Payload
        return payload.username; // Passe dies an, falls der Benutzername unter einem anderen Schlüssel gespeichert ist
    } catch (error) {
        console.error('Fehler beim Dekodieren des Tokens:', error);
        return null;
    }
}
