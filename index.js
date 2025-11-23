const express = require('express');
const cors=require('cors');
const app=express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port=process.env.PORT || 3000;


// MiddleWare use 

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.e9cdfrv.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// connect mondoDb 
async function run() {
  try {
    
    await client.connect();
    const db=client.db("Zap_Shift_DB");
    const parcelCollection=db.collection("parcels");

    // Send parcel Crud Operation
    app.get("/parcels",async(req,res)=>{
        const query={};
        const {email}=req.query
        if(email)
        {
          query.senderMail=email
        }
        const option={sort:{createdAt:-1}}
        const cursor=parcelCollection.find(query,option)
        const result = await cursor.toArray();
        res.send(result)
    })

    // get parcel by Id:

app.get("/parcels/:id",async(req,res)=>{
  const id=req.params.id;
 const query={_id:new ObjectId(id)};
 const result = await parcelCollection.findOne(query);

  res.send(result);
})
    app.post('/parcels',async(req,res)=>{
        const parcel=req.body;
        parcel.createdAt=new Date();
        const result=await parcelCollection.insertOne(parcel);
        return res.send(result);
    })

    // parcels delete operation:
    app.delete("/parcels/:id",async(req,res)=>{
      const id=req.params.id;
      const query={
        _id:new ObjectId(id)
      }
      const result = await parcelCollection.deleteOne(query);
      res.send(result)
    })
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   
  }
}
run().catch(console.dir);
// listener

app.listen(port,()=>{
    console.log(`Example app listening on port ${port}`);
})