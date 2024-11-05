 

function fetchLists() {
    const db = firebase.firestore();  // Ensure firebase is initialized

    return db.collection("languages").get().then(snapshot => {
        const lists = [];
        snapshot.forEach(doc => {
            lists.push({ id: doc.id, ...doc.data() });
        });
        return lists;
    }).catch(error => {
        console.error("Error getting documents: ", error);
    });
}


function addList(listData) {
    const db = firebase.firestore();  // Ensure firebase is initialized

    db.collection("languages").add({
        user: listData.user,
        scriptUrl: listData.scriptUrl,
        name: listData.name,
        lang: listData.lang
    }).then(docRef => {
        console.log("Document written with ID: ", docRef.id);
        alert('List added successfully!');
        // Optionally clear form or update UI here
    }).catch(error => {
        console.error("Error adding document: ", error);
        alert('Error adding list.');
    });
}

function openTab(evt, tabName) {
    var i, tabcontent, tabbuttons;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// Initially open the first tab
document.addEventListener('DOMContentLoaded', function() {
    document.getElementsByClassName("tab-button")[0].click();
    fetchAndDisplayLists();  // This will load and display the lists when the page loads
});


// Example: Fetch lists from Firestore and display
function fetchAndDisplayLists() {
    // Use Firebase Firestore fetch functionality here
    // Assume function 'fetchLists' fetches data from Firestore
    fetchLists().then(lists => {
        const display = document.getElementById('listDisplay');
        lists.forEach(list => {
            const div = document.createElement('div');
            div.textContent = `User: ${list.user}, Name: ${list.name}, Language: ${list.lang}`;
            display.appendChild(div);
        });
    }).catch(error => console.error('Error fetching lists:', error));
}

// Add event listener for the add form
document.getElementById('addForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const user = event.target.user.value;
    const scriptUrl = event.target.scriptUrl.value;
    const name = event.target.name.value;
    const lang = event.target.lang.value;
    // Function to add list to Firestore
    addList({ user, scriptUrl, name, lang });
});
