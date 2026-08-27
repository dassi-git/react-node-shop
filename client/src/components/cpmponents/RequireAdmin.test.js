import React from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import authReducer from '../../features/user/authSlice'
import RequireAdmin from './RequireAdmin'

jest.mock('react-router-dom', () => ({
    Navigate: ({ to }) => <div data-testid="redirect">{to}</div>,
    useLocation: () => ({ pathname: '/admin-orders' })
}), { virtual: true })

const renderGuard = (auth) => render(
    <Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth } })}>
        <RequireAdmin>
            <div>admin content</div>
        </RequireAdmin>
    </Provider>
)

describe('RequireAdmin', () => {
    it('waits for auth bootstrap before redirecting', () => {
        renderGuard({ authInitialized: false, isUserLoggedIn: false, user: null })

        expect(screen.getByText('טוען חיבור...')).toBeTruthy()
    })

    it('redirects a regular user away from admin routes', () => {
        renderGuard({ authInitialized: true, isUserLoggedIn: true, user: { role: 'User' } })

        expect(screen.queryByText('admin content')).toBeNull()
        expect(screen.getByTestId('redirect').textContent).toBe('/')
    })

    it('renders admin content for an administrator', () => {
        renderGuard({ authInitialized: true, isUserLoggedIn: true, user: { role: 'Admin' } })

        expect(screen.getByText('admin content')).toBeTruthy()
    })
})