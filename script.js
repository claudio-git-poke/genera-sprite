const SUPABASE_URL = "https://tssgkiytaxmcrodrcrpu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzc2draXl0YXhtY3JvZHJjcnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzkwNDAsImV4cCI6MjEwMzYxNTA0MH0.BrQEJodD0Vbrqo_S-tiOYxgbk3CEvfnjtR6TO0L43aE";
const BUCKET_NAME = "assets";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Funzione per verificare se la cartella esiste già su Supabase
async function checkFolderExists(folderPath) {
    // Dividiamo il percorso per estrarre la cartella e il prefisso
    const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .list(folderPath, { limit: 1 });
    
    if (error) return false;
    // Se trova almeno un file all'interno di quella cartella, allora esiste già
    return data && data.length > 0;
}

// Funzione comune per ritagliare e pulire le immagini
async function splitAndCleanSprites(fileInput) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(fileInput);
        
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = async function() {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                
                const halfW = Math.floor(img.width / 2);
                const halfH = Math.floor(img.height / 2);
                
                canvas.width = halfW;
                canvas.height = halfH;

                const parts = [
                    { name: "standing.png", x: 0, y: 0 },
                    { name: "back.png", x: halfW, y: 0 },
                    { name: "looking-left.png", x: 0, y: halfH },
                    { name: "looking-right.png", x: halfW, y: halfH }
                ];

                const processedParts = [];

                for (let part of parts) {
                    ctx.clearRect(0, 0, halfW, halfH);
                    ctx.drawImage(img, part.x, part.y, halfW, halfH, 0, 0, halfW, halfH);
                    
                    const imgData = ctx.getImageData(0, 0, halfW, halfH);
                    const data = imgData.data;

                    const sampleIndex = (5 * halfW + 5) * 4;
                    const bgR = data[sampleIndex];
                    const bgG = data[sampleIndex + 1];
                    const bgB = data[sampleIndex + 2];

                    for (let i = 0; i < data.length; i += 4) {
                        let r = data[i];
                        let g = data[i+1];
                        let b = data[i+2];

                        if (Math.abs(r - bgR) < 30 && Math.abs(g - bgG) < 30 && Math.abs(b - bgB) < 30) {
                            data[i+3] = 0; // Trasparente
                        }
                    }
                    ctx.putImageData(imgData, 0, 0);

                    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
                    processedParts.push({ name: part.name, blob: blob });
                }
                resolve(processedParts);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// Gestione Upload su Supabase con controllo omonimia bloccante
async function processAndUpload() {
    const statusDiv = document.getElementById("status");
    const category = document.getElementById("category").value;
    const nameInput = document.getElementById("spriteName").value.trim();
    const fileInput = document.getElementById("imageFile").files[0];

    if (!nameInput) { alert("Inserisci un nome per lo sprite!"); return; }
    if (!fileInput) { alert("Seleziona un'immagine!"); return; }

    statusDiv.innerText = "Verifica omonimia su Supabase...";
    const folderPath = `sprite/${category}/${nameInput}`;
    
    const exists = await checkFolderExists(folderPath);
    
    if (exists) {
        const overwrite = confirm(`ATTENZIONE: La cartella "${nameInput}" esiste già in sprite/${category}!\n\nVuoi sovrascriverla? (Premi Annulla per bloccare l'operazione)`);
        if (!overwrite) {
            statusDiv.innerText = "Operazione annullata per evitare sovrascritture accidentali.";
            return;
        }
    }

    statusDiv.innerText = "Elaborazione immagini in corso...";
    try {
        const sprites = await splitAndCleanSprites(fileInput);

        statusDiv.innerText = "Caricamento su Supabase...";
        for (let sprite of sprites) {
            const filePath = `${folderPath}/${sprite.name}`;
            const { error } = await supabaseClient.storage
                .from(BUCKET_NAME)
                .upload(filePath, sprite.blob, { upsert: true });

            if (error) throw error;
        }

        statusDiv.innerText = "Caricamento completato con successo!";
        alert("Sprite caricati correttamente su Supabase!");
    } catch (err) {
        console.error(err);
        statusDiv.innerText = "Errore durante il processo.";
        alert("Si è verificato un errore.");
    }
}

// Gestione Download Locale diretto
async function downloadLocally() {
    const statusDiv = document.getElementById("status");
    const nameInput = document.getElementById("spriteName").value.trim();
    const fileInput = document.getElementById("imageFile").files[0];

    if (!nameInput) { alert("Inserisci prima un nome per lo sprite (verrà usato per i file)!"); return; }
    if (!fileInput) { alert("Seleziona un'immagine!"); return; }

    statusDiv.innerText = "Preparazione download locale...";
    try {
        const sprites = await splitAndCleanSprites(fileInput);

        // Scarica ogni file singolarmente sul computer dell'utente
        for (let sprite of sprites) {
            const url = URL.createObjectURL(sprite.blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${nameInput}_${sprite.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        statusDiv.innerText = "Download completato!";
    } catch (err) {
        console.error(err);
        statusDiv.innerText = "Errore durante il download.";
    }
}
