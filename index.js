const express = require('express');
const cors=require('cors');
const app=express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port=process.env.PORT || 3000;

const stripe = require('stripe')(process.env.STRIPE_SECRET);
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
function generateTrackingId() {
  const prefix = "TRK"; 
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${prefix}-${date}-${random}`;
}

async function run() {
  try {
    
    await client.connect();
    const db=client.db("Zap_Shift_DB");
    const parcelCollection=db.collection("parcels");
    const paymentCollection=db.collection("payments");
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

      // payment related api
  app.post('/create-checkout-session', async (req, res) => {
    const paymentInfo=req.body;

    const amount =parseInt(paymentInfo.cost)*100;
    const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        
        price_data:{
          currency:'USD',
          product_data:{
            name:paymentInfo.parcelName
          },
          unit_amount:amount,
        },
        quantity: 1,
      },
    ],
    customer_email:paymentInfo.senderEmail,
    mode: 'payment',
    metadata:{
      parcelID:paymentInfo.parcelId,
      parcelName:paymentInfo.parcelName
    },
    success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,

  });


  res.send(session.url);
});

  app.patch("/payment-success",async(req,res)=>{
    const sessionId=req.query.sessionId;
    

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log(session)
      if(session.payment_status==="paid")
      {
        // console.log(session.metadata.parcelID)
        const query={_id:new ObjectId(session.metadata.parcelID)};
        const trackingId=generateTrackingId();
        const transactionId=session.payment_intent;
        const queryPayment={
          transactionId:transactionId
        }

        const paymentExists = await paymentCollection.findOne(queryPayment)
        if(paymentExists)
        {
          return res.send({message:"Already paid transaction id is ",transactionId})
        }
        const update={
          $set:{
            paymentStatus:"paid",
            trackingId:trackingId,
          }
        }
        const option={};
        const result = await parcelCollection.updateOne(query,update,option)

        const payment={
          amount:session.amount_total/100,
          currency:session.currency,
          customer_email:session.customer_email,
          parcelId:session.metadata.parcelID,
          parcelName:session.metadata.parcelName,
          paymentStatus:session.payment_status,
          transactionId:session. payment_intent,
          paidAt:new Date()
        }

        
        if(session.payment_status==="paid")
        {

          const paymentResult=await paymentCollection.insertOne(payment);
          res.send({success:true,modifyParcel:result,paymentInfor:paymentResult})
        }
      }
  
    
    res.send({success:false});
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