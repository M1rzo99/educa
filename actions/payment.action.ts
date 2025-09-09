'use server'

import { connectToDatabase } from '@/lib/mongoose'
import stripe from '@/lib/stripe'
import { atachPayment, getCustomer } from './customer.action'
import { generateNumericId } from '@/lib/utils'

// Zero-decimal valyutalar (asosiylari)
const ZERO_DECIMAL = new Set(['krw', 'jpy', 'vnd', 'clp', 'isk'])

function toStripeAmount(amount: number, currency: string) {
	const cur = currency.toLowerCase()
	return ZERO_DECIMAL.has(cur)
		? Math.round(amount)        // ₩220 -> 220
		: Math.round(amount * 100)  // $2.20 -> 220
}

export const payment = async (
	price: number,
	clerkId: string,
	paymentMethod: string
) => {
	try {
		await connectToDatabase()
		const customer = await getCustomer(clerkId)
		await atachPayment(paymentMethod, customer.id)

		// amount ni normalize qilamiz
		const normalizedAmount = toStripeAmount(price, 'usd') // yoki dynamic currency

		const paymentIntent = await stripe.paymentIntents.create({
			amount: normalizedAmount,   // ❗ integer bo‘ldi
			currency: 'usd',           // kerak bo‘lsa dynamic qiling
			customer: customer.id,
			payment_method: paymentMethod,
			metadata: { orderId: generateNumericId() },
			automatic_payment_methods: { enabled: true }, // optional
		})

		return paymentIntent.client_secret
	} catch (error) {
		const result = error as Error
		throw new Error(result.message)
	}
}

export const retrievePayment = async (pi: string) => {
	try {
		return await stripe.paymentIntents.retrieve(pi, {
			expand: ['payment_method'],
		})
	} catch (error) {
		const result = error as Error
		throw new Error(result.message)
	}
}

export const applyCoupon = async (code: string) => {
	try {
		const coupon = await stripe.coupons.retrieve(code)
		return JSON.parse(JSON.stringify(coupon))
	} catch (error) {
		const result = error as Error
		throw new Error(result.message)
	}
}

export const getBalance = async () => {
	try {
		const data = await stripe.balance.retrieve()
		const totalAvaliable = data.available.reduce(
			(acc, cur) => acc + cur.amount,
			0
		)
		const totalPending = data.pending.reduce((acc, cur) => acc + cur.amount, 0)

		return totalAvaliable + totalPending
	} catch (error) {
		const result = error as Error
		throw new Error(result.message)
	}
}
