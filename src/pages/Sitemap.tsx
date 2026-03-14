import { Link } from "react-router-dom";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Sitemap = () => {
  return (
    <>
      <DynamicHelmet titlePrefix="Sitemap" description="Complete sitemap of {eventName} website. Find all pages and sections easily." />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 pt-page">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
              Sitemap
            </h1>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Main Pages */}
              <div>
                <h2 className="text-2xl font-bold mb-4 text-foreground">Main Pages</h2>
                <nav className="space-y-2">
                  <Link to="/" className="block text-muted-foreground hover:text-primary transition-colors">
                    Home
                  </Link>
                  <Link to="/why-attend" className="block text-muted-foreground hover:text-primary transition-colors">
                    Why Attend
                  </Link>
                  <Link to="/who-attends" className="block text-muted-foreground hover:text-primary transition-colors">
                    Who Attends
                  </Link>
                  <Link to="/registration" className="block text-muted-foreground hover:text-primary transition-colors">
                    Registration
                  </Link>
                  <Link to="/exhibit" className="block text-muted-foreground hover:text-primary transition-colors">
                    Exhibit
                  </Link>
                </nav>
              </div>

              {/* Exhibitors & Speakers */}
              <div>
                <h2 className="text-2xl font-bold mb-4 text-foreground">Exhibitors & Speakers</h2>
                <nav className="space-y-2">
                  <Link to="/exhibitors" className="block text-muted-foreground hover:text-primary transition-colors">
                    Exhibitors
                  </Link>
                  <Link to="/speakers" className="block text-muted-foreground hover:text-primary transition-colors">
                    Speakers
                  </Link>
                </nav>
              </div>

              {/* Legal & Portal */}
              <div>
                <h2 className="text-2xl font-bold mb-4 text-foreground">Legal & Portal</h2>
                <nav className="space-y-2">
                  <Link to="/privacy-policy" className="block text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                  <Link to="/terms-conditions" className="block text-muted-foreground hover:text-primary transition-colors">
                    Terms & Conditions
                  </Link>
                  <Link to="/cookie-policy" className="block text-muted-foreground hover:text-primary transition-colors">
                    Cookie Policy
                  </Link>
                  <Link to="/exhibitor-portal/login" className="block text-muted-foreground hover:text-primary transition-colors">
                    Exhibitor Login
                  </Link>
                  <Link to="/login" className="block text-muted-foreground hover:text-primary transition-colors">
                    Admin Login
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Sitemap;
