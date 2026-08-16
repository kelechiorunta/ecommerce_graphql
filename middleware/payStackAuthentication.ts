import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
/**
 * Verify the request headers has a paystack signature header
 * to validate the webhook request is from paystack
 * @param req
 * @returns boolean
 */
const verifyPayStackSignature = (req: any): boolean => {
  console.table(process.env.PAYSTACK_SECRET_KEY as string);
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY as string)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return hash === req.headers['x-paystack-signature'];
};

/**Middleware to handle paystack request
 * @param req: Express Request
 * @param res: Express Response
 * @param next: Express NextFunction
 * @returns next
 */
const authenticatePayStackHeader = (req: any, res: any, next: any) => {
  try {
    if (!verifyPayStackSignature(req)) {
      return res.sendStatus(401);
    }
    next();
  } catch (err) {
    if (err instanceof Error) {
      console.error('Error', err.message);
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

export default authenticatePayStackHeader;
