import React from 'react'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

const BrokenComponent = () => {
    throw new Error('render failure')
}

describe('ErrorBoundary', () => {
    let consoleError

    beforeEach(() => {
        consoleError = console.error
        console.error = jest.fn()
    })

    afterEach(() => {
        console.error = consoleError
    })

    it('renders a recovery action when a child throws', () => {
        render(
            <ErrorBoundary>
                <BrokenComponent />
            </ErrorBoundary>
        )

        expect(screen.getByRole('alert').textContent).toContain('אירעה שגיאה בטעינת המסך')
        expect(screen.getByRole('button', { name: 'טען מחדש' })).toBeTruthy()
    })
})
