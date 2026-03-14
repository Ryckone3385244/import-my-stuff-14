import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";

const CookiePolicy = () => {
  return (
    <>
      <DynamicHelmet titlePrefix="Cookie Policy" description="Cookie Policy for {eventName}. Learn about how we use cookies and similar technologies on our website." />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 pt-page">
          <div className="container mx-auto px-4 py-12 max-w-4xl">
            <EditableText
              pageName="cookie-policy"
              sectionName="header"
              contentKey="title"
              defaultValue="Cookie Policy"
              className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent"
              as="h1"
            />
            
            <div className="prose prose-lg max-w-none space-y-6 text-foreground">
              <EditableText
                pageName="cookie-policy"
                sectionName="header"
                contentKey="last-updated"
                defaultValue={`Last updated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                className="text-muted-foreground"
                as="p"
              />

              <section className="space-y-4">
                <EditableText pageName="cookie-policy" sectionName="section-1" contentKey="heading" defaultValue="1. What Are Cookies?" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="cookie-policy" sectionName="section-1" contentKey="content-1" defaultValue="Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners." as="p" />
                <EditableText pageName="cookie-policy" sectionName="section-1" contentKey="content-2" defaultValue="Cookies allow websites to recognize your device and remember certain information about your visit, such as your preferences and actions taken on the site." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="cookie-policy" sectionName="section-2" contentKey="heading" defaultValue="2. How We Use Cookies" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="cookie-policy" sectionName="section-2" contentKey="intro" defaultValue="Customer Connect Expo 2026 uses cookies to:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><EditableText pageName="cookie-policy" sectionName="section-2" contentKey="item-1" defaultValue="Ensure our website functions properly" as="span" /></li>
                  <li><EditableText pageName="cookie-policy" sectionName="section-2" contentKey="item-2" defaultValue="Remember your preferences and settings" as="span" /></li>
                  <li><EditableText pageName="cookie-policy" sectionName="section-2" contentKey="item-3" defaultValue="Understand how you use our website" as="span" /></li>
                  <li><EditableText pageName="cookie-policy" sectionName="section-2" contentKey="item-4" defaultValue="Improve your user experience" as="span" /></li>
                  <li><EditableText pageName="cookie-policy" sectionName="section-2" contentKey="item-5" defaultValue="Analyze website traffic and performance" as="span" /></li>
                  <li><EditableText pageName="cookie-policy" sectionName="section-2" contentKey="item-6" defaultValue="Deliver relevant content and advertisements" as="span" /></li>
                  <li><EditableText pageName="cookie-policy" sectionName="section-2" contentKey="item-7" defaultValue="Enable security features and prevent fraud" as="span" /></li>
                </ul>
              </section>

              <section className="space-y-4">
                <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="heading" defaultValue="3. Types of Cookies We Use" className="text-2xl font-bold text-foreground" as="h2" />
                
                <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="subheading-1" defaultValue="3.1 Strictly Necessary Cookies" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="content-1" defaultValue="These cookies are essential for the website to function properly. They enable core functionality such as security, network management, and accessibility. You cannot opt out of these cookies without affecting the website's functionality." as="p" />
                <div className="bg-muted p-4 rounded-lg">
                  <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="examples-1-title" defaultValue="Examples:" as="p" className="font-bold" />
                  <ul className="list-disc pl-6 mt-2">
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-1-1" defaultValue="Session management cookies" as="span" /></li>
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-1-2" defaultValue="Authentication cookies" as="span" /></li>
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-1-3" defaultValue="Security cookies" as="span" /></li>
                  </ul>
                </div>

                <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="subheading-2" defaultValue="3.2 Performance Cookies" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="content-2" defaultValue="These cookies collect information about how visitors use our website, such as which pages are visited most often and any error messages received. This helps us improve how our website works." as="p" />
                <div className="bg-muted p-4 rounded-lg">
                  <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="examples-2-title" defaultValue="Examples:" as="p" className="font-bold" />
                  <ul className="list-disc pl-6 mt-2">
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-2-1" defaultValue="Google Analytics cookies" as="span" /></li>
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-2-2" defaultValue="Page load time tracking" as="span" /></li>
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-2-3" defaultValue="Error reporting" as="span" /></li>
                  </ul>
                </div>

                <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="subheading-3" defaultValue="3.3 Functionality Cookies" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="content-3" defaultValue="These cookies allow our website to remember choices you make (such as your username, language, or region) and provide enhanced, more personalized features." as="p" />
                <div className="bg-muted p-4 rounded-lg">
                  <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="examples-3-title" defaultValue="Examples:" as="p" className="font-bold" />
                  <ul className="list-disc pl-6 mt-2">
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-3-1" defaultValue="Language preference cookies" as="span" /></li>
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-3-2" defaultValue="User interface customization" as="span" /></li>
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-3-3" defaultValue="Video player settings" as="span" /></li>
                  </ul>
                </div>

                <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="subheading-4" defaultValue="3.4 Targeting/Advertising Cookies" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="content-4" defaultValue="These cookies are used to deliver advertisements that are relevant to you and your interests. They may also be used to limit the number of times you see an advertisement and measure the effectiveness of advertising campaigns." as="p" />
                <div className="bg-muted p-4 rounded-lg">
                  <EditableText pageName="cookie-policy" sectionName="section-3" contentKey="examples-4-title" defaultValue="Examples:" as="p" className="font-bold" />
                  <ul className="list-disc pl-6 mt-2">
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-4-1" defaultValue="Social media advertising cookies" as="span" /></li>
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-4-2" defaultValue="Retargeting cookies" as="span" /></li>
                    <li><EditableText pageName="cookie-policy" sectionName="section-3" contentKey="example-4-3" defaultValue="Campaign tracking" as="span" /></li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <EditableText pageName="cookie-policy" sectionName="section-4" contentKey="heading" defaultValue="4. Third-Party Cookies" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="cookie-policy" sectionName="section-4" contentKey="content" defaultValue="Some cookies are placed by third-party services that appear on our pages. We do not control these cookies, and you should check the third-party websites for more information about these cookies and how to manage them." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="cookie-policy" sectionName="section-5" contentKey="heading" defaultValue="5. Session vs. Persistent Cookies" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="cookie-policy" sectionName="section-5" contentKey="subheading-1" defaultValue="Session Cookies" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="cookie-policy" sectionName="section-5" contentKey="content-1" defaultValue="These are temporary cookies that expire when you close your browser." as="p" />
                <EditableText pageName="cookie-policy" sectionName="section-5" contentKey="subheading-2" defaultValue="Persistent Cookies" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="cookie-policy" sectionName="section-5" contentKey="content-2" defaultValue="These remain on your device for a set period or until you delete them. They help us remember your preferences across multiple browsing sessions." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="cookie-policy" sectionName="section-6" contentKey="heading" defaultValue="6. How to Manage Cookies" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="cookie-policy" sectionName="section-6" contentKey="intro" defaultValue="You can control and manage cookies in various ways:" as="p" />
                <EditableText pageName="cookie-policy" sectionName="section-6" contentKey="subheading-1" defaultValue="Browser Settings" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="cookie-policy" sectionName="section-6" contentKey="content-1" defaultValue="Most browsers allow you to refuse or accept cookies, delete existing cookies, or set preferences for certain websites. Please note that if you choose to block cookies, some features of our website may not function properly." as="p" />
                <EditableText pageName="cookie-policy" sectionName="section-6" contentKey="subheading-2" defaultValue="Opt-Out Tools" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="cookie-policy" sectionName="section-6" contentKey="content-2" defaultValue="You can opt out of certain third-party cookies through industry opt-out programs such as the Network Advertising Initiative (NAI) or the Digital Advertising Alliance (DAA)." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="cookie-policy" sectionName="section-7" contentKey="heading" defaultValue="7. Do Not Track Signals" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="cookie-policy" sectionName="section-7" contentKey="content" defaultValue="Some browsers include a 'Do Not Track' feature that signals to websites that you do not want your online activity tracked. At this time, we do not respond to Do Not Track signals." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="cookie-policy" sectionName="section-8" contentKey="heading" defaultValue="8. Updates to This Policy" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="cookie-policy" sectionName="section-8" contentKey="content" defaultValue="We may update this Cookie Policy from time to time to reflect changes in technology or legal requirements. We will notify you of any significant changes by posting a notice on our website." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="cookie-policy" sectionName="section-9" contentKey="heading" defaultValue="9. Contact Us" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="cookie-policy" sectionName="section-9" contentKey="intro" defaultValue="If you have any questions about our Cookie Policy, please contact us at:" as="p" />
                <div>
                  <EditableText pageName="cookie-policy" sectionName="section-9" contentKey="email" defaultValue="Email: privacy@grabandgoexpo.com" as="p" />
                  <EditableText pageName="cookie-policy" sectionName="section-9" contentKey="address" defaultValue="Address: ExCeL London, Royal Victoria Dock, 1 Western Gateway, London E16 1XL" as="p" />
                </div>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CookiePolicy;
