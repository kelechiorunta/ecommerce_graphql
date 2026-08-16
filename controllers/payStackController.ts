import axios from 'axios';
import { producer } from '../kafka/producer';

export const payStackWebhookNotifications = async (req: any, res: any) => {
  try {
    const { event, data } = req.body;

    if (event === 'charge.success') {
      console.log('Event was successful');
      console.log(data);
      try {
        const response = await axios.post('http://localhost:3980/api/paystack/invoice', data, {
          withCredentials: true,
          headers: {
            Cookie: req.headers.cookie
          }
        });

        const invoiceData = response.data;
        // Call the producer to publish notifications from paystack to subscribers
        // Validate invoice saved or created before publishing event
        if (invoiceData) {
          await producer.send({
            topic: 'products',
            messages: [
              {
                value: JSON.stringify({ event: 'NEW_INVOICE', data: invoiceData })
              }
            ]
          });
        }

        console.log('Message', invoiceData.message);
      } catch (err) {
        const apiError = err instanceof Error ? err.message : err;
        console.error(apiError);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
};
