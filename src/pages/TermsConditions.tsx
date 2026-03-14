import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";

const TermsConditions = () => {
  return (
    <>
      <DynamicHelmet titlePrefix="Terms & Conditions" description="Terms and Conditions for {eventName}. Read our terms for attendees, exhibitors, and sponsors." />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 pt-page">
          <div className="container mx-auto px-4 py-12 max-w-4xl">
            <EditableText
              pageName="terms-conditions"
              sectionName="header"
              contentKey="title"
              defaultValue="Terms & Conditions"
              className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent"
              as="h1"
            />
            
            <div className="prose prose-lg max-w-none space-y-6 text-foreground">
              <EditableText
                pageName="terms-conditions"
                sectionName="header"
                contentKey="last-updated"
                defaultValue={`Last updated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                className="text-muted-foreground"
                as="p"
              />

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-1" contentKey="heading" defaultValue="1. Agreement to Terms" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-1" contentKey="content" defaultValue="By accessing or using the Grab & Go Expo 2026 website or attending our event, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not access the website or attend the event." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-2" contentKey="heading" defaultValue="2. Event Registration" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-2" contentKey="subheading-1" defaultValue="2.1 Registration Requirements" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-2" contentKey="intro" defaultValue="To register for Grab & Go Expo 2026, you must:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><EditableText pageName="terms-conditions" sectionName="section-2" contentKey="item-1" defaultValue="Be at least 18 years of age" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-2" contentKey="item-2" defaultValue="Provide accurate and complete information" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-2" contentKey="item-3" defaultValue="Have the authority to bind any company you represent" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-2" contentKey="item-4" defaultValue="Pay applicable registration fees (if required)" as="span" /></li>
                </ul>
                <EditableText pageName="terms-conditions" sectionName="section-2" contentKey="subheading-2" defaultValue="2.2 Registration Confirmation" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-2" contentKey="content" defaultValue="Upon successful registration, you will receive a confirmation email. Please retain this for your records and present it at the event entrance if required." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-3" contentKey="heading" defaultValue="3. Payment Terms" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-3" contentKey="subheading-1" defaultValue="3.1 Fees" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-3" contentKey="content-1" defaultValue="Certain registrations, exhibitor spaces, or services may require payment. All fees are stated in GBP and are exclusive of VAT unless otherwise stated." as="p" />
                <EditableText pageName="terms-conditions" sectionName="section-3" contentKey="subheading-2" defaultValue="3.2 Payment Methods" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-3" contentKey="content-2" defaultValue="We accept major credit cards, debit cards, and bank transfers. Payment must be received in full before your registration is confirmed or exhibitor space is allocated." as="p" />
                <EditableText pageName="terms-conditions" sectionName="section-3" contentKey="subheading-3" defaultValue="3.3 Refund Policy" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-3" contentKey="intro" defaultValue="Refunds are subject to the following conditions:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><EditableText pageName="terms-conditions" sectionName="section-3" contentKey="item-1" defaultValue="Cancellations made more than 90 days before the event: 75% refund" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-3" contentKey="item-2" defaultValue="Cancellations made 60-90 days before the event: 50% refund" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-3" contentKey="item-3" defaultValue="Cancellations made 30-60 days before the event: 25% refund" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-3" contentKey="item-4" defaultValue="Cancellations made less than 30 days before the event: No refund" as="span" /></li>
                </ul>
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-4" contentKey="heading" defaultValue="4. Exhibitor Terms" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-4" contentKey="subheading-1" defaultValue="4.1 Stand Allocation" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-4" contentKey="content-1" defaultValue="Stand spaces are allocated on a first-come, first-served basis upon receipt of full payment. We reserve the right to change stand locations if necessary for operational reasons." as="p" />
                <EditableText pageName="terms-conditions" sectionName="section-4" contentKey="subheading-2" defaultValue="4.2 Exhibitor Responsibilities" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-4" contentKey="intro" defaultValue="Exhibitors must:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><EditableText pageName="terms-conditions" sectionName="section-4" contentKey="item-1" defaultValue="Comply with all venue regulations and health & safety requirements" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-4" contentKey="item-2" defaultValue="Maintain adequate insurance coverage" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-4" contentKey="item-3" defaultValue="Staff their stand during all opening hours" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-4" contentKey="item-4" defaultValue="Clean and vacate their space by the specified time" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-4" contentKey="item-5" defaultValue="Not engage in any illegal or inappropriate conduct" as="span" /></li>
                </ul>
                <EditableText pageName="terms-conditions" sectionName="section-4" contentKey="subheading-3" defaultValue="4.3 Prohibited Items" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-4" contentKey="content-2" defaultValue="Exhibitors may not display or distribute materials that are offensive, discriminatory, illegal, or in violation of intellectual property rights." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-5" contentKey="heading" defaultValue="5. Event Conduct" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-5" contentKey="intro" defaultValue="All attendees and exhibitors must:" as="p" />
                <ul className="list-disc pl-6 space-y-2">
                  <li><EditableText pageName="terms-conditions" sectionName="section-5" contentKey="item-1" defaultValue="Behave professionally and respectfully" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-5" contentKey="item-2" defaultValue="Follow venue rules and instructions from event staff" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-5" contentKey="item-3" defaultValue="Not engage in harassment, discrimination, or disruptive behavior" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-5" contentKey="item-4" defaultValue="Respect intellectual property and confidential information" as="span" /></li>
                  <li><EditableText pageName="terms-conditions" sectionName="section-5" contentKey="item-5" defaultValue="Comply with applicable laws and regulations" as="span" /></li>
                </ul>
                <EditableText pageName="terms-conditions" sectionName="section-5" contentKey="content" defaultValue="We reserve the right to remove any individual from the event without refund if they violate these standards." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-6" contentKey="heading" defaultValue="6. Intellectual Property" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-6" contentKey="content" defaultValue="All content, trademarks, logos, and intellectual property displayed at Grab & Go Expo 2026 or on our website are owned by their respective owners. You may not use, reproduce, or distribute any materials without prior written permission." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-7" contentKey="heading" defaultValue="7. Liability and Disclaimers" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-7" contentKey="subheading-1" defaultValue="7.1 Limitation of Liability" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-7" contentKey="content-1" defaultValue="Grab & Go Expo 2026 shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your attendance at the event or use of the website. This includes, but is not limited to, loss of profits, data, or business opportunities." as="p" />
                <EditableText pageName="terms-conditions" sectionName="section-7" contentKey="subheading-2" defaultValue="7.2 Event Changes" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-7" contentKey="content-2" defaultValue="We reserve the right to modify, postpone, or cancel the event due to circumstances beyond our control, including force majeure events. In such cases, we will make reasonable efforts to notify attendees and provide alternative arrangements or refunds where appropriate." as="p" />
                <EditableText pageName="terms-conditions" sectionName="section-7" contentKey="subheading-3" defaultValue="7.3 Personal Belongings" className="text-xl font-semibold text-foreground" as="h3" />
                <EditableText pageName="terms-conditions" sectionName="section-7" contentKey="content-3" defaultValue="Grab & Go Expo 2026 is not responsible for loss, theft, or damage to personal belongings at the event venue." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-8" contentKey="heading" defaultValue="8. Data Protection" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-8" contentKey="content" defaultValue="We are committed to protecting your personal data in accordance with applicable data protection laws. Please refer to our Privacy Policy for detailed information on how we collect, use, and protect your personal information." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-9" contentKey="heading" defaultValue="9. Governing Law" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-9" contentKey="content" defaultValue="These Terms and Conditions are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of England and Wales." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-10" contentKey="heading" defaultValue="10. Changes to Terms" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-10" contentKey="content" defaultValue="We reserve the right to update or modify these Terms and Conditions at any time without prior notice. Any changes will be posted on this page with an updated 'Last updated' date. Your continued use of the website or attendance at the event following such changes constitutes acceptance of the revised terms." as="p" />
              </section>

              <section className="space-y-4">
                <EditableText pageName="terms-conditions" sectionName="section-11" contentKey="heading" defaultValue="11. Contact Information" className="text-2xl font-bold text-foreground" as="h2" />
                <EditableText pageName="terms-conditions" sectionName="section-11" contentKey="intro" defaultValue="If you have any questions about these Terms and Conditions, please contact us at:" as="p" />
                <div>
                  <EditableText pageName="terms-conditions" sectionName="section-11" contentKey="email" defaultValue="Email: info@grabandgoexpo.com" as="p" />
                  <EditableText pageName="terms-conditions" sectionName="section-11" contentKey="address" defaultValue="Address: ExCeL London, Royal Victoria Dock, 1 Western Gateway, London E16 1XL" as="p" />
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

export default TermsConditions;
