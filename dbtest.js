const mongoose = require('mongoose');

// Connecting to database:
mongoose.connect("mongodb://localhost:27017/artAuctionDB", 
    {useUnifiedTopology: true, useNewUrlParser: true});

//note: _id is auto created
const artworkSchema = new mongoose.Schema ({
    pid: Number, //pid of seller
    category: String, // Painting, Mixed Media, or Sculpture
    title: String,
    imageURL: String,
    yearCreated: Number,
    length: Number, //in inches
    width: Number, //in inches
    price: Number //in CAD, starting bid price
});

const personSchema = new mongoose.Schema ({
    pid: Number,
    firstName: String,
    lastName: String,
    role: String, //seller or buyer
    artworksToSell: [artworkSchema] //
});

// artworks collection
const Artwork = mongoose.model("Artwork", artworkSchema);
// people collection
const Person = mongoose.model("Person", personSchema);

const seller2 = new Person ({
    pid: 109577350773763,
    firstName: "Jenn",
    lastName: "Lau",
    role: "seller"
});

const artwork1 = new Artwork ({
    pid: 109577350773763,
    category: "Painting", // Painting, Mixed Media, or Sculpture
    title: "The moon shines",
    imageURL: "https://myurl.com",
    yearCreated: 1989,
    length: 50, //in inches
    width: 20, //in inches
    price: 62 //in CAD
})

const artwork2 = new Artwork ({
    pid: 109577350773763,
    category: "Mixed Media", // Painting, Mixed Media, or Sculpture
    title: "everything is bring",
    imageURL: "https://myurl.com",
    yearCreated: 2001,
    length: 60, //in inches
    width: 50, //in inches
    price: 30 //in CAD
})

Person.updateOne({pid: 109577350773763}, 
    {artworksToSell: [artwork1, artwork2]},
    (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log("update successful");
        }
});
// artwork1.save();
// artwork2.save();
// seller2.save();

// Update person
Person.updateOne({pid: 109577350773763}, {firstName: "Mary"}, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("Successfully updated the document");
    }
});

// read from db:
Person.find((err, people) => {
    if (err) {
        console.log(err);
    } else {
        people.forEach(person => {
            console.log(`${person.firstName}: ${person.artworksToSell}`)
        });
    }
    // close db connection after last action to be performed:
    mongoose.connection.close();
});



