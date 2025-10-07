function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="app-footer-content">
        <div className="footer-section">
          <h3 className="footer-brand">ComIt</h3>
          <p className="footer-tagline">Find the perfect time to meet</p>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Contact</h4>
          <ul className="footer-links">
            <li>
              <a href="mailto:sheng.patrick@gmail.com" className="footer-link footer-link-highlight">
                sheng.patrick@gmail.com
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Feedback</h4>
          <ul className="footer-links">
            <li>
              <a href="mailto:sheng.patrick@gmail.com" className="footer-link footer-link-highlight">
                Report bugs or suggestions
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Sponsors</h4>
          <div className="footer-sponsors">
            <p className="footer-sponsor-text">Interested in sponsoring?</p>
            <a href="mailto:sheng.patrick@gmail.com?subject=ComIt%20Sponsorship" className="footer-link footer-link-highlight">
              Get in touch
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-sponsored">
          Sponsored by: Regan Ong
        </p>
        <p className="footer-copyright">
          © {currentYear} ComIt. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;