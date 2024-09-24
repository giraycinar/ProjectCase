const express = require("express");
const { MongoClient } = require('mongodb');
const app = express();

// MongoDB bağlantı URL'si
const mongoUri = 'mongodb://localhost:27017'; // Yerel MongoDB için
const dbName = 'airportdb'; // Veritabanı ismi

app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(express.static('node_modules'));
app.use(express.urlencoded({ extended: true })); // Form verilerini almak için

// MongoDB'ye bağlanma
async function connectToMongoDB() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log("MongoDB'ye başarıyla bağlanıldı!");
    return client;
}

// API'den uçuş verilerini alma
async function getFlights() {
    const client = await connectToMongoDB();
    const db = client.db(dbName);
    const flightsCollection = db.collection('flights');
    const flights = await flightsCollection.find({}).toArray();
    await client.close();
    return flights;
}

// Uçuşları görüntüleme
app.get("/", (req, res) => {
    res.render("index");
});

// Uçuşları listeleme
app.get('/flights', async (req, res) => {
    const flights = await getFlights();
    res.render('flights', { flights });
});

// Uçuşları arama
app.get('/search-flights', async (req, res) => {
    const { startDate, endDate, hours1, hours2 } = req.query;

    try {
        const client = await connectToMongoDB();
        const db = client.db(dbName);
        const flightsCollection = db.collection('flights');

        // Başlangıç ve bitiş tarih/saatleri oluştur
        const startDateTime = new Date(`${startDate}T${hours1}`);
        const endDateTime = new Date(`${endDate}T${hours2}`);

        // MongoDB sorgusu
        const query = {
            $and: [
                { 
                    scheduleDate: { $gte: startDateTime.toISOString().split('T')[0] } 
                },
                { 
                    scheduleDate: { $lte: endDateTime.toISOString().split('T')[0] } 
                },
                {
                    scheduleTime: {
                        $gte: hours1,
                        $lte: hours2
                    }
                }
            ]
        };

        // MongoDB sorgusuyla uçuşları bulma
        const flights = await flightsCollection.find(query).toArray();

        if (flights.length > 0) {
            res.render('flights', { flights });
        } else {
            res.render('flights', { flights: [], message: 'Belirtilen tarih ve saat aralığında uçuş bulunamadı.' });
        }

        await client.close(); // MongoDB bağlantısını kapat
    } catch (error) {
        console.error('Uçuş arama hatası:', error);
        res.status(500).send('Uçuşları ararken bir hata oluştu.');
    }
});




// Kullanıcının rezervasyonlarını görüntüleme
app.get('/my-flights', async (req, res) => {
    try {
        const client = await connectToMongoDB();
        const db = client.db(dbName);
        const flightsCollection = db.collection('flights');

        // Kullanıcının uçuşlarını bulma (örnek: userId ile)
        const userId = req.query.userId; // Kullanıcı ID'sini sorgudan alıyoruz
        const userFlights = await flightsCollection.find({ userId }).toArray();

        await client.close();
        res.render('my-flights', { flights: userFlights });
    } catch (error) {
        console.error('Uçuşları getirirken hata oluştu:', error);
        res.status(500).send('Uçuşları getirirken bir hata oluştu.');
    }
});

// Tanımlı olmayan rotalara 404 hatası döndürme
app.use((req, res) => {
    res.status(404).send("404 Not Found");
});

// Uygulamayı başlat
app.listen(3000, () => {
    console.log('Uygulama 3000. portta çalışıyor.');
});
