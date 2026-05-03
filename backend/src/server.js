import 'dotenv/config';import express from'express';import cors from'cors';import Stripe from'stripe';
const app=express();app.use(cors({origin:process.env.FRONTEND_URL||true,credentials:true}));app.use(express.json());
app.get('/api/health',(req,res)=>res.json({ok:true,name:'Viewly API'}));
app.post('/api/ai/music-assistant',async(req,res)=>{const{prompt}=req.body;res.json({answer:[`Analyse pour: ${prompt}`,'Trouver titres similaires','Classer par BPM, mood, energie','Creer playlist ecoutable','Preparer ordre DJ set et idees contenu']});});
app.post('/api/billing/checkout',async(req,res)=>{if(!process.env.STRIPE_SECRET_KEY)return res.status(400).json({error:'Missing STRIPE_SECRET_KEY'});const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const session=await stripe.checkout.sessions.create({mode:'subscription',line_items:[{price:req.body.priceId,quantity:1}],success_url:(process.env.FRONTEND_URL||'http://localhost:5173')+'/billing/success',cancel_url:(process.env.FRONTEND_URL||'http://localhost:5173')+'/billing'});res.json({url:session.url});});
app.listen(process.env.PORT||8000,()=>console.log('Viewly API running'));
