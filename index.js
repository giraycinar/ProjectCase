const express = require("express");
const { MongoClient } = require('mongodb');
const app = express();
const axios = require('axios');

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
    const { date1, date2, hours1, hours2 } = req.query;

    console.log(`Başlangıç Tarihi: ${date1}`);
    console.log(`Bitiş Tarihi: ${date2}`);
    console.log(`Başlangıç Saati: ${hours1}`);
    console.log(`Bitiş Saati: ${hours2}`);

    try {
        const client = await connectToMongoDB();
        const db = client.db(dbName);
        const flightsCollection = db.collection('flights');

        const query = {};

        // Tarih ve saat aralığı için sorgu oluşturma
        if (date1 && date2 && hours1 && hours2) {
            const startDateTime = new Date(`${date1}T${hours1}`); // Başlangıç tarihi ve saati
            const endDateTime = new Date(`${date2}T${hours2}`); // Bitiş tarihi ve saati
            endDateTime.setHours(endDateTime.getHours() + 1); // Bitiş zamanını bir saat ileri alarak genişletiyoruz

            // Sorguyu oluşturuyoruz
            query['scheduleDateTime'] = { $gte: startDateTime, $lt: endDateTime }; // scheduleDateTime alanını sorguluyoruz
        }

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


// Rezervasyon yapma
app.post('/reserve-flight', async (req, res) => {
    const flightData = req.body;

    // Geçmiş tarihe rezervasyon yapılmaması kontrolü
    const departureDate = new Date(flightData.departureDate);
    if (departureDate < new Date()) {
        return res.status(400).send("Geçmiş tarihli uçuşlar için rezervasyon yapamazsınız.");
    }

    try {
        const client = await connectToMongoDB();
        const db = client.db(dbName);
        const flightsCollection = db.collection('flights');

        // Rezervasyonu MongoDB'ye kaydetme
        await flightsCollection.insertOne(flightData);
        console.log('Uçuş rezervasyonu başarıyla kaydedildi!');

        await client.close();
        res.redirect("/my-flights"); // Kullanıcıyı uçuşlarım sayfasına yönlendir
    } catch (error) {
        console.error('Rezervasyon kaydetme hatası:', error);
        res.status(500).send('Rezervasyon kaydedilirken bir hata oluştu.');
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
