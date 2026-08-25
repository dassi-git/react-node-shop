import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useCapturePaypalOrderMutation, useCompleteStripeCheckoutMutation } from './orderSlice'

const PaymentSuccessPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [completeStripeCheckout] = useCompleteStripeCheckoutMutation()
    const [capturePaypalOrder] = useCapturePaypalOrderMutation()
    const [state, setState] = useState({ loading: true, error: '' })
    const handled = useRef(false)
    const provider = searchParams.get('provider')

    useEffect(() => {
        if (handled.current) return
        handled.current = true
        const complete = async () => {
            try {
                if (provider === 'stripe') {
                    const sessionId = searchParams.get('session_id')
                    if (!sessionId) throw new Error('חסר מזהה תשלום')
                    await completeStripeCheckout(sessionId).unwrap()
                } else if (provider === 'paypal') {
                    const paypalOrderId = searchParams.get('token')
                    if (!paypalOrderId) throw new Error('חסר מזהה תשלום')
                    await capturePaypalOrder(paypalOrderId).unwrap()
                } else {
                    throw new Error('ספק תשלום לא מזוהה')
                }
                setState({ loading: false, error: '' })
            } catch (error) {
                setState({ loading: false, error: error?.data?.message || error.message || 'לא הצלחנו לאשר את התשלום' })
            }
        }
        complete()
    }, [capturePaypalOrder, completeStripeCheckout, provider, searchParams])

    return <div style={{ maxWidth: 620, margin: '4rem auto', padding: 16 }}><Card title={state.loading ? 'מאשר תשלום...' : state.error ? 'התשלום לא אושר' : 'התשלום אושר בהצלחה'}><div style={{ display: 'grid', gap: 20, justifyItems: 'center', textAlign: 'center' }}>{state.loading && <ProgressSpinner />}{!state.loading && <i className={`pi ${state.error ? 'pi-times-circle' : 'pi-check-circle'}`} style={{ fontSize: '4rem', color: state.error ? '#c0392b' : '#27845d' }} />}{state.error && <p>{state.error}</p>}{!state.loading && !state.error && <p>ההזמנה עודכנה לסטטוס שולם.</p>} {!state.loading && <Button label="חזרה להזמנות שלי" icon="pi pi-arrow-right" onClick={() => navigate('/my-orders')} />}</div></Card></div>
}

export default PaymentSuccessPage