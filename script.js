// Credenziali Supabase
const SUPABASE_URL = "https://tssgkiytaxmcrodrcrpu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzc2draXl0YXhtY3JvZHJjcnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzkwNDAsImV4cCI6MjEwMzYxNTA0MH0.BrQEJodD0Vbrqo_S-tiOYxgbk3CEvfnjtR6TO0L43aE";
const BUCKET_NAME = "assets";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkFolderExists(path) {
    const { data, error } = await supabaseClient.storage.from(BUCKET_NAME).list(path, { limit: 1 });
    if (error) return false;
    // Se trova file nella cartella, consideriamo che esista già
    return data && data.length > 0;
}

async function processAndUpload() {
    const statusDiv = document.getElementById("status");
    const category = document.getElementById("category").value;
    const nameInput = document.getElementById("spriteName").value.trim();
    const fileInput = document.getElementById("imageFile").files[0];

    if (!nameInput) {
        alert("Inserisci un nome per lo sprite!");
        return;
    }
    if (!fileInput) {
        alert("Seleziona un'immagine!");
        return;
    }

    statusDiv.innerText = "Verifica esistenza cartella...";

    const folderPath = `${category}/${nameInput}`;
    
    // Controllo se la cartella esiste già su Supabase
    const exists = await checkFolderExists(folderPath);
    
    if (exists) {
        const overwrite = confirm(`La cartella "${nameInput}" esiste già in ${category}! Vuoi sovrascriverla?`);
        if (!overwrite) {
            statusDiv.innerText = "Operazione annullata.";
            return;
        }
    }

    statusDiv.innerText = "Taglio dell'immagine in corso...";

    // Lettura dell'immagine tramite Canvas nel browser
    const reader = new FileReader();
    reader.readAsDataURL(fileInput);
    
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = async function() {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            
            const halfW = Math.floor(img.width / 2);
            const halfH = Math.floor(img.height / 2);
            
            canvas.width = halfW;
            canvas.height = halfH;

            // Mappatura delle 4 parti nei nomi richiesti
            // Ordine griglia 2x2: 
            // 0,0 (Alto-Sx) -> standing.png
            // 1,0 (Alto-Dx) -> back.png
            // 0,1 (Basso-Sx) -> looking-left.png
            // 1,1 (Basso-Dx) -> looking-right.png
            const parts = [
                { name: "standing.png", x: 0, y: 0 },
                { name: "back.png", x: halfW, y: 0 },
                { name: "looking-left.png", x: 0, y: halfH },
                { name: "looking-right.png", x: halfW, y: halfH }
            ];

            statusDiv.innerText = "Rimozione sfondo e upload su Supabase...";

            for (let part of parts) {
                ctx.clearRect(0, 0, halfW, halfH);
                ctx.drawImage(img, part.x, part.y, halfW, halfH, 0, 0, halfW, halfH);
                
                // Rimuoviamo il colore di sfondo (campionando il pixel in alto a sinistra del ritaglio)
                const imgData = ctx.getImageData(0, 0, halfW, halfH);
                const data = imgData.data;
                const bgR = data[0];
                const bgG = data[1];
                const bgB = data[2];

                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i];
                    let g = data[i+1];
                    let b = data[i+2];

                    if (Math.abs(r - bgR) < 15 && Math.abs(g - bgG) < 15 && Math.abs(b - bgB) < 15) {
                        data[i+3] = 0; // Trasparente
                    }
                }
                ctx.putImageData(imgData, 0, 0);

                // Convertiamo il canvas in Blob (file PNG)
                const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
                
                const filePath = `${folderPath}/${part.name}`;

                // Upload su Supabase Storage
                const { error } = await supabaseClient.storage
                    .from(BUCKET_NAME)
                    .upload(filePath, blob, { upsert: true });

                if (error) {
                    console.error("Errore upload:", error);
                    statusDiv.innerText = `Errore durante il caricamento di ${part.name}`;
                    return;
                }
            }

            statusDiv.innerText = "Completato con successo! File caricati.";
            alert("Sprite elaborati e caricati correttamente su Supabase!");
        }
    };
}
