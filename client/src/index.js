import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {Provider} from "react-redux"
import store from './app/store';
import { PrimeReactProvider } from 'primereact/api';
import ErrorBoundary from './components/ErrorBoundary';
// import 'primeflex/primeflex.scss';
import '/node_modules/primeflex/primeflex.css'
import 'primeicons/primeicons.css';
import "primereact/resources/themes/lara-light-cyan/theme.css";
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
      <PrimeReactProvider>
       <Provider store={store}>
        <App />
        </Provider>
        </PrimeReactProvider>
    </ErrorBoundary>
);


