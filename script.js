// Funzione per copiare il prompt negli appunti e aprire Google Gemini
function copyAndOpenGemini() {
    const promptBox = document.getElementById("promptText");
    
    // Copia il testo negli appunti
    navigator.clipboard.writeText(promptBox.value).then(() => {
        // Apre Gemini in una nuova scheda
        window.open("https://gemini.google.com/", "_blank");
    }).catch(err => {
        console.error("Errore durante la copia del prompt: ", err);
        alert("Impossibile copiare automaticamente il prompt.");
    });
}
