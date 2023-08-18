const stripe = require('stripe')('sk_test_51NWyK6SC7WXy8eUt5PPBT4xMp8rxYECwTb1IQXCpsltyc9GC9XvtC3vd6gwVnfKkKT2cdcv3LRGfYyKlNguhqfMh00VmZuOhbW');
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

app.get('/healthcheck', async (_req, res, _next) => {

  const healthcheck = {
      uptime: process.uptime(),
      message: 'OK',
      timestamp: Date.now()
  };
  try {
      res.send(healthcheck);
  } catch (error) {
      healthcheck.message = error;
      res.status(503).send();
  }
});

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = process.env.ENDPOINT_SECRET;

let storedPaymentObject = {};

app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data.object;
        const paymentObject = await handlePaymentSucceeded(paymentIntentSucceeded);
        // response.json({ id: id }); // Send paymentObject as JSON response
        console.log("The id is: "+ paymentObject.id);
        storedPaymentObject = paymentObject;
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
        response.status(200); // Respond with a 200 status to acknowledge receipt of the event
    }
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.get('/payment', async (request, response) => {
  try {
    const paymentObject = storedPaymentObject; // Get the stored payment ID
    if (!paymentObject) {
      throw new Error('No payment ID available');
    }

    // const paymentInfo = await fetchPaymentInformation(paymentObject);
    response.json(paymentObject); // Respond with the payment information as JSON
  } catch (error) {
    response.status(400).send(`Error fetching payment information: ${error.message}`);
  }
});


async function handlePaymentSucceeded(paymentIntent) {
  // Custom logic to handle the payment_intent.succeeded event
  // console.log('Payment succeeded:', paymentIntent.id);
  const paymentObject = await stripe.paymentIntents.retrieve(paymentIntent.id);
  console.log('Payment Intent: ', paymentObject);
  return paymentIntent;
}

app.listen(8080, () => console.log('Running on port 8080'));
