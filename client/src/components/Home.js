import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();

    const categories = [
        { title: 'מארזי מתנה', icon: '🎁', text: 'בסטייל יוקרתי ומוביל' },
        { title: 'עיצובי אירועים', icon: '✨', text: 'לחתונות, ימי הולדת ומסיבות' },
        { title: 'פירות טריים', icon: '🍇', text: 'בחירה איכותית בכל הזמנה' },
        { title: 'קולקציות עונתיות', icon: '🌿', text: 'מוצרים עדכניים ומושכים' },
    ];

    return (
        <div className="home-container">
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">🍓 🍊 🍇 🥝</div>
                    <span className="eyebrow">קולקציית המותגים המובילה</span>
                    <h1 className="hero-title">
                        happily - חוויית קנייה יוקרתית לעיצובי אירועים ומוצרים איכותיים
                    </h1>
                    <p className="hero-subtitle">
                        עיצובי מתנה, מארזים, נקניקים, פירות וסטייל יוקרתי לכל רגע מיוחד
                    </p>
                    <div className="hero-actions">
                        <Button 
                            label="גלו את הקולקציה" 
                            icon="pi pi-arrow-left"
                            className="hero-cta-button"
                            size="large"
                            onClick={() => navigate('/allProduct')}
                        />
                        <button className="secondary-outline" onClick={() => navigate('/allProduct')}>
                            צפו במבצעים
                        </button>
                    </div>

                    <div className="stats-row">
                        <div className="stat-item">
                            <strong>15K+</strong>
                            <span>לקוחות מרוצים</span>
                        </div>
                        <div className="stat-item">
                            <strong>4.9/5</strong>
                            <span>דירוג ממוצע</span>
                        </div>
                        <div className="stat-item">
                            <strong>24/7</strong>
                            <span>שירות לקוחות</span>
                        </div>
                    </div>
                </div>

                <div className="hero-visual" aria-label="product showcase">
                    <div className="visual-card feature-card-main">
                        <span className="card-tag">הקולקציה החמה</span>
                        <h3>מארזי חברות ומזון</h3>
                        <p>עיצוב יוקרתי, אספקה מהירה, שירות אישי</p>
                    </div>
                    <div className="visual-card mini-card one">🎉</div>
                    <div className="visual-card mini-card two">🍊</div>
                    <div className="visual-card mini-card three">💝</div>
                </div>

                <div className="hero-image-decoration">
                    <div className="decoration-circle circle-1"></div>
                    <div className="decoration-circle circle-2"></div>
                    <div className="decoration-circle circle-3"></div>
                </div>
            </section>

            <section className="category-showcase">
                <div className="section-head">
                    <span className="section-kicker">קולקציות מובילות</span>
                    <h2>בחרו את הסגנון שמתאים לכם</h2>
                </div>

                <div className="categories-grid">
                    {categories.map((category) => (
                        <button key={category.title} className="category-card" onClick={() => navigate('/allProduct')}>
                            <div className="category-icon">{category.icon}</div>
                            <h3>{category.title}</h3>
                            <p>{category.text}</p>
                        </button>
                    ))}
                </div>
            </section>

            <section className="features-section">
                <div className="features-container">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <i className="pi pi-heart-fill feature-icon"></i>
                        </div>
                        <h3>עיצובים מושלמים</h3>
                        <p>כל מוצר נבנה בקפידה עם עין למשמעות, צבע וטעם</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <i className="pi pi-sparkles feature-icon"></i>
                        </div>
                        <h3>איכות משובחת</h3>
                        <p>בחרנו ספקים איכותיים ומוצרים שמשאירים רושם</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <i className="pi pi-gift feature-icon"></i>
                        </div>
                        <h3>התאמה לכל אירוע</h3>
                        <p>מתנות, מארזי פירות, אירועים פרטים וציבוריים</p>
                    </div>
                </div>
            </section>

            <section className="contact-section">
                <div className="contact-content">
                    <h2 className="contact-title">בואו ליצור ביחד משהו מיוחד</h2>
                    <p className="contact-subtitle">נשמח לעזור לכם להפוך את האירוע שלכם למושלם</p>
                    <div className="contact-details">
                        <a href="tel:0583215865" className="contact-item">
                            <i className="pi pi-phone"></i>
                            <span>058-3215865</span>
                        </a>
                        <a href="mailto:100happily@gmail.com" className="contact-item">
                            <i className="pi pi-envelope"></i>
                            <span>100happily@gmail.com</span>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
