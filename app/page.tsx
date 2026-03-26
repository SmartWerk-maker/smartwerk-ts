"use client";

import "./home.css";
import Image from "next/image";
import Link from "next/link";
import { useHomeAuth } from "@/components/useHomeAuth";

export default function HomePage() {
  const { isLogged } = useHomeAuth(); // null | true | false

  const loggedIn = isLogged === true;

  return (
    <div>
      {/* HEADER */}
      <header>
        <Image
          src="/assets/img/image.png"
          alt="SmartWerk Logo"
          width={100}
          height={50}
        />

        <nav>
          <Link href="/" className="btn-primary">
            Home
          </Link>
          <Link href="/features" className="btn-primary">
            Features
          </Link>
          <Link href="/tools-preview" className="btn-primary">
            Tools Preview
          </Link>
          <Link href="/pricing" className="btn-primary">
            Prices
          </Link>

          {loggedIn ? (
            <Link className="btn-primary" href="/dashboard">
              Dashboard
            </Link>
          ) : (
            <Link className="btn-primary" href="/login">
              Log in
            </Link>
          )}

          <Link href="/register" className="btn-primary">
            Sign up
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero">
        <h2>All-in-One Platform for Freelancers</h2>
        <p>
          Invoices, taxes, contracts, templates, ROI tools — everything in one
          place. No more juggling between platforms.
        </p>

        {loggedIn ? (
          <Link className="btn-primary" href="/dashboard">
            Open Dashboard
          </Link>
        ) : (
          <Link className="btn-primary" href="/register">
            Try SmartWerk Free
          </Link>
        )}
      </section>

      {/* MAIN SECTION */}
      <section className="section">
        <h3>
          From invoicing and contracts to tax calculators, CVs, and client
          emails — SmartWerk is the all-in-one workspace for modern freelancers.
        </h3>

        <div className="features">
          <div className="feature-box">
            <h4>🧾 Invoices</h4>
            <p>Send professional invoices with VAT, signature & status tracking.</p>
          </div>

          <div className="feature-box">
            <h4>🧠 Tax Estimation</h4>
            <p>KOR, ZZP, MKB, startersaftrek — automated under Dutch rules.</p>
          </div>

          <div className="feature-box">
            <h4>📄 Templates</h4>
            <p>Contracts, quotes, reminders, Gemeente emails — ready to use.</p>
          </div>

          <div className="feature-box">
            <h4>📊 ROI Tools</h4>
            <p>Estimate profitability and what you save using SmartWerk.</p>
          </div>

          <div className="feature-box">
            <h4>📄 CV Builder</h4>
            <p>Create your branded freelance CV in minutes.</p>
          </div>

          <div className="feature-box">
            <h4>📚 Bookkeeping</h4>
            <p>Scan receipts, export expenses — bookkeeping coming soon.</p>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="section">
        <h3>How does SmartWerk work?</h3>

        <div className="steps">
          <div className="step-box">
            <h4>1. Create an account</h4>
            <p>It’s free, no credit card required.</p>
          </div>

          <div className="step-box">
            <h4>2. Choose a template</h4>
            <p>Invoice, contract, quote, reminder — or build a CV.</p>
          </div>

          <div className="step-box">
            <h4>3. Fill in your data</h4>
            <p>Or use Smart AI to pre-fill information.</p>
          </div>

          <div className="step-box">
            <h4>4. Export & save</h4>
            <p>Download as PDF or store in dashboard.</p>
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="section">
        <h3>Who is SmartWerk for?</h3>

        <div className="audience">
          <div className="audience-box">
            <h4>✅ Freelancers & ZZP’ers</h4>
            <p>Especially in the Netherlands.</p>
          </div>

          <div className="audience-box">
            <h4>✅ Starters & Small Businesses</h4>
            <p>Get everything set up from day one.</p>
          </div>

          <div className="audience-box">
            <h4>✅ Creative Professionals</h4>
            <p>Designers, developers, consultants.</p>
          </div>

          <div className="audience-box">
            <h4>✅ Digital Nomads</h4>
            <p>Tools that travel with you.</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section">
        <h3>Stories from our users</h3>

        <div className="testimonial-grid">
          <div className="testimonial-card">
            <img
              src="https://randomuser.me/api/portraits/men/32.jpg"
              alt="Jeroen"
            />
            <p>“SmartWerk does VAT & invoices in 1 click.”</p>
            <p className="testimonial-author">Jeroen M. • Rotterdam</p>
          </div>

          <div className="testimonial-card">
            <img
              src="https://randomuser.me/api/portraits/women/21.jpg"
              alt="Anna"
            />
            <p>“Finally something built for Dutch freelancers.”</p>
            <p className="testimonial-author">Anna B. • Utrecht</p>
          </div>

          <div className="testimonial-card">
            <img
              src="https://randomuser.me/api/portraits/men/45.jpg"
              alt="Luca"
            />
            <p>“SmartWerk feels like a personal assistant.”</p>
            <p className="testimonial-author">Luca T. • Amsterdam</p>
          </div>

          <div className="testimonial-card">
            <img
              src="https://randomuser.me/api/portraits/women/64.jpg"
              alt="Monika"
            />
            <p>“I work remotely — SmartWerk keeps me on track.”</p>
            <p className="testimonial-author">Monika S. • Nomad</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <p>© 2025–2030 SmartWerk. All rights reserved.</p>
        <div>
          <Link href="/privacy">Privacy Policy</Link> •{" "}
          <Link href="/terms">Terms</Link> • smartwerk.team@gmail.com
        </div>
      </footer>
    </div>
  );
}