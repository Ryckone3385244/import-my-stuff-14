import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";

const PrivacyPolicy = () => {
  return (
    <>
      <DynamicHelmet titlePrefix="Privacy Policy" description="Privacy Policy for {eventName}. Learn how we collect, use, and protect your personal information." />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 pt-page">
          <div className="container mx-auto px-4 py-12 max-w-4xl">
            <EditableText
              pageName="privacy-policy"
              sectionName="header"
              contentKey="title"
              defaultValue="Privacy Policy"
              className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent"
              as="h1"
            />
            
            <div className="prose prose-lg max-w-none space-y-6 text-foreground">
              <EditableText
                pageName="privacy-policy"
                sectionName="header"
                contentKey="last-updated"
                defaultValue={`Last updated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                className="text-muted-foreground"
                as="p"
              />

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-1" contentKey="heading" defaultValue="1. Introduction" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-1" contentKey="content" defaultValue='Welcome to Customer Connect Expo 2026 ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or register for our event.' as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-2" contentKey="heading" defaultValue="2. Information We Collect" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-2" contentKey="intro-1" defaultValue="We collect information that you provide directly to us when you:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-1-1" defaultValue="Register for the expo" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-1-2" defaultValue="Sign up for our newsletter" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-1-3" defaultValue="Contact us with inquiries" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-1-4" defaultValue="Apply to exhibit at our event" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-1-5" defaultValue="Browse our website" as="span" /></li>
                </ul>
                <EditableText pageName="privacy-policy" sectionName="section-2" contentKey="intro-2" defaultValue="The types of information we may collect include:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-2-1" defaultValue="Name and contact information (email address, phone number, mailing address)" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-2-2" defaultValue="Company name and job title" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-2-3" defaultValue="Payment information (processed securely through third-party providers)" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-2-4" defaultValue="Event preferences and interests" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-2" contentKey="item-2-5" defaultValue="Device and usage information (IP address, browser type, pages visited)" as="span" /></li>
                </ul>
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-3" contentKey="heading" defaultValue="3. How We Use Your Information" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-3" contentKey="intro" defaultValue="We use the information we collect to:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><EditableText pageName="privacy-policy" sectionName="section-3" contentKey="item-1" defaultValue="Process your registration and manage your attendance" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-3" contentKey="item-2" defaultValue="Communicate with you about the event, including updates and important information" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-3" contentKey="item-3" defaultValue="Send you marketing communications (with your consent)" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-3" contentKey="item-4" defaultValue="Improve our website and services" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-3" contentKey="item-5" defaultValue="Analyze trends and user behavior" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-3" contentKey="item-6" defaultValue="Prevent fraud and ensure security" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-3" contentKey="item-7" defaultValue="Comply with legal obligations" as="span" /></li>
                </ul>
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-4" contentKey="heading" defaultValue="4. Sharing Your Information" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-4" contentKey="intro" defaultValue="We may share your information with:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-4" contentKey="item-1-label" defaultValue="Event partners and sponsors" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-4" contentKey="item-1-text" defaultValue="who provide services or products relevant to the expo" as="span" /></li>
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-4" contentKey="item-2-label" defaultValue="Service providers" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-4" contentKey="item-2-text" defaultValue="who assist us in operating our website and conducting our business" as="span" /></li>
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-4" contentKey="item-3-label" defaultValue="Legal authorities" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-4" contentKey="item-3-text" defaultValue="when required by law or to protect our rights" as="span" /></li>
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-4" contentKey="item-4-label" defaultValue="Business successors" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-4" contentKey="item-4-text" defaultValue="in the event of a merger, acquisition, or asset sale" as="span" /></li>
                </ul>
                <EditableText pageName="privacy-policy" sectionName="section-4" contentKey="content" defaultValue="We do not sell your personal information to third parties." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-5" contentKey="heading" defaultValue="5. Cookies and Tracking Technologies" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-5" contentKey="intro" defaultValue="We use cookies and similar tracking technologies to enhance your experience on our website. These technologies help us:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><EditableText pageName="privacy-policy" sectionName="section-5" contentKey="item-1" defaultValue="Remember your preferences" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-5" contentKey="item-2" defaultValue="Understand how you use our website" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-5" contentKey="item-3" defaultValue="Improve website functionality" as="span" /></li>
                  <li><EditableText pageName="privacy-policy" sectionName="section-5" contentKey="item-4" defaultValue="Deliver targeted advertising" as="span" /></li>
                </ul>
                <p>
                  <EditableText pageName="privacy-policy" sectionName="section-5" contentKey="content-1" defaultValue="You can control cookie preferences through your browser settings. For more information, see our " as="span" />
                  <a href="/cookie-policy" className="text-primary hover:underline">
                    <EditableText pageName="privacy-policy" sectionName="section-5" contentKey="link-text" defaultValue="Cookie Policy" as="span" />
                  </a>
                  <EditableText pageName="privacy-policy" sectionName="section-5" contentKey="content-2" defaultValue="." as="span" />
                </p>
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-6" contentKey="heading" defaultValue="6. Data Security" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-6" contentKey="content" defaultValue="We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-7" contentKey="heading" defaultValue="7. Your Rights" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-7" contentKey="intro" defaultValue="Depending on your location, you may have the following rights regarding your personal information:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-1-label" defaultValue="Access:" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-1-text" defaultValue="Request access to your personal information" as="span" /></li>
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-2-label" defaultValue="Correction:" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-2-text" defaultValue="Request correction of inaccurate information" as="span" /></li>
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-3-label" defaultValue="Deletion:" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-3-text" defaultValue="Request deletion of your information" as="span" /></li>
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-4-label" defaultValue="Objection:" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-4-text" defaultValue="Object to processing of your information" as="span" /></li>
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-5-label" defaultValue="Portability:" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-5-text" defaultValue="Request transfer of your information" as="span" /></li>
                  <li><strong><EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-6-label" defaultValue="Withdrawal:" as="span" /></strong> <EditableText pageName="privacy-policy" sectionName="section-7" contentKey="item-6-text" defaultValue="Withdraw consent at any time" as="span" /></li>
                </ul>
                <EditableText pageName="privacy-policy" sectionName="section-7" contentKey="content" defaultValue="To exercise these rights, please contact us using the details below." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-8" contentKey="heading" defaultValue="8. Data Retention" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-8" contentKey="content" defaultValue="We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-9" contentKey="heading" defaultValue="9. International Data Transfers" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-9" contentKey="content" defaultValue="Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-10" contentKey="heading" defaultValue="10. Children's Privacy" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-10" contentKey="content" defaultValue="Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-11" contentKey="heading" defaultValue="11. Changes to This Privacy Policy" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-11" contentKey="content" defaultValue='We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.' as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="privacy-policy" sectionName="section-12" contentKey="heading" defaultValue="12. Contact Us" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="privacy-policy" sectionName="section-12" contentKey="intro" defaultValue="If you have any questions about this Privacy Policy or our privacy practices, please contact us at:" as="p" />
                <div className="bg-muted p-4 rounded-lg">
                  <p><strong>Email:</strong> <EditableText pageName="privacy-policy" sectionName="section-12" contentKey="email" defaultValue="info@grabandgoexpo.com" as="span" /></p>
                  <p><strong>Address:</strong> <EditableText pageName="privacy-policy" sectionName="section-12" contentKey="address" defaultValue="ExCeL London, One Western Gateway, Royal Victoria Dock, London E16 1XL" as="span" /></p>
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

export default PrivacyPolicy;
