const SUPABASE_URL = "https://tssgkiytaxmcrodrcrpu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzc2draXl0YXhtY3JvZHJjcnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzkwNDAsImV4cCI6MjEwMzYxNTA0MH0.BrQEJodD0Vbrqo_S-tiOYxgbk3CEvfnjtR6TO0L43aE";
const BUCKET_NAME = "assets";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkFolderExists(path) {
    const { data, error } = await supabaseClient.storage.from(BUCKET_NAME).list(path, { limit: 1 });
    if (error) return false;
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

    // Inseriamo la cartella madre "sprite" come avevi su Supabase
    const folderPath = `sprite/${category}/${nameInput}`;
    
    const exists = await checkFolderExists(folderPath);
    
    if (exists) {
        const overwrite = confirm(`La cartella "${nameInput}" esiste già in sprite/${category}! Vuoi sovrascriverla?`);
        if (!overwrite) {
            statusDiv.innerText = "Operazione annullata.";
            return;
        }
    }

    statusDiv.innerText = "Taglio dell'immagine in corso...";

    const reader = new FileReader();
    reader.readAsDataURL(fileInput);
    
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = async function() {
            // Usiamo canvas temporaneo con willReadFrequently per ottimizzare
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

            statusDiv.innerText = "Rimozione sfondo e upload su Supabase...";

            for (let part of parts) {
                ctx.clearRect(0, 0, halfW, halfH);
                ctx.drawImage(img, part.x, part.y, halfW, halfH, 0, 0, halfW, halfH);
                
                const imgData = ctx.getImageData(0, 0, halfW, halfH);
                const data = imgData.data;

                // Prendiamo il colore di sfondo campionando un punto sicuro all'interno del margine (es. x=5, y=5)
                const sampleIndex = (5 * halfW + 5) * 4;
                const bgR = data[sampleIndex];
                const bgG = data[sampleIndex + 1];
                const bgB = data[sampleIndex + 2];

                // Rimuoviamo lo sfondo con una tolleranza leggermente più ampia per pulire meglio
                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i];
                    let g = data[i+1];
                    let b = data[i+2];

                    if (Math.abs(r - bgR) < 30 && Math.abs(g - bgG) < 30 && Math.abs(b - bgB) < 30) {
                        data[i+3] = 0; // Trasparente
                    }
                }
                ctx.putImageData(imgData, 0, 0);

                const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
                const filePath = `${folderPath}/${part.name}`;

                const { error } = await supabaseClient.storage
                    .from(BUCKET_NAME)
                    .upload(filePath, blob, { upsert: true });

                if (error) {
                    console.error("Errore upload:", error);
                    statusDiv.innerText = `Errore durante il caricamento di ${part.name}`;
                    return;
                }
            }

            statusDiv.innerText = "Completato con successo!";
            alert("Sprite tagliati, ripuliti e caricati correttamente dentro sprite/" + category + "/" + nameInput + "!");
        }
    };
}
