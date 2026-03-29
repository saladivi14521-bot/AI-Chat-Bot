export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 29, 2026</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
        <p className="text-gray-300 leading-relaxed">
          SmartRep AI collects information you provide when creating an account (name, email), 
          connecting your Facebook Page (page name, page ID, access tokens), and data from customer 
          conversations handled through our platform.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
        <p className="text-gray-300 leading-relaxed">
          We use your information to provide AI-powered customer support automation, process messages 
          from your Facebook Page, generate intelligent replies, and improve our services.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">3. Data Sharing</h2>
        <p className="text-gray-300 leading-relaxed">
          We do not sell your data. We share data only with Facebook/Meta as required to process 
          messages through their platform, and with Google AI services to generate responses.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
        <p className="text-gray-300 leading-relaxed">
          We implement industry-standard security measures including encryption in transit and at rest, 
          secure token storage, and regular security audits.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">5. Data Deletion</h2>
        <p className="text-gray-300 leading-relaxed">
          You can request deletion of your data at any time by contacting us. When you disconnect 
          your Facebook Page, we remove all associated tokens and conversation data.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">6. Contact Us</h2>
        <p className="text-gray-300 leading-relaxed">
          For any privacy concerns, contact us at: mdhabibove2@gmail.com
        </p>
      </section>
    </div>
  );
}
