const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const app = express()
const port = process.env.PORT || 5000
const cors = require("cors")
const dotenv = require("dotenv").config()
const jwt = require('jsonwebtoken');
app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Picker server Running Well")

})
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized" })
    }
    const token = authHeader.split(" ")[1]

    jwt.verify(token, process.env.PRIVATE_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden" })
        }
        req.decoded = decoded;
        next()
    })
}
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.izp32.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect()
        const toolsCollection = client.db("tools").collection("tools")
        const usersCollection = client.db("users").collection("users")
        const ordersCollection = client.db("orders").collection("orders")

        app.get("/tools", async (req, res) => {
            const result = await toolsCollection.find().toArray()
            res.send(result)
        })
        // making user 
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, option)

            const token = jwt.sign({ email: email }, process.env.PRIVATE_KEY, { expiresIn: "1d" })
            res.send({ token })
        })
        // get single items by id 
        app.get("/purchase/:id", async (req, res) => {
            const id = req.params.id

            const query = { _id: ObjectId(id) }
            const result = await toolsCollection.findOne(query)
            res.send(result)
        })
        // store order 
        app.post("/purchase", async (req, res) => {
            const doc = req.body
            const result = await ordersCollection.insertOne(doc)
            res.send(result)
        })
        // get  orders by user 
        app.get("/orders",verifyJWT, async(req, res) => {
            const email = req.query.email
            const filter = { email: email }
            const result = await ordersCollection.find(filter).toArray()
            res.send(result)
        })

    }
    finally {

    }
}
run().catch(console.dir)


app.listen(port, () => {
    console.log("Also well");
})