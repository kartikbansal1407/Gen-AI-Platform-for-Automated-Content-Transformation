import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Content Forge",
  description: "Content Forge privacy policy for Drufiy A.I. Private Limited.",
};

const sections = [
  {
    title: "1. Scope",
    body: [
      "This Policy applies to Content Forge and related services operated by Drufiy. AI, document-generation, database and hosting providers process information under their own terms and privacy policies.",
    ],
  },
  {
    title: "2. Information we may collect",
    body: [
      "Operator access credentials, session cookies and information you provide in support communications. The workspace signs in with an operator access code.",
      "Transformation controls, including target audience, tone, language, detail level, communication objective and content style, plus workspace appearance settings.",
      "Source material, including text, prompts, documents, URLs, images and videos, together with generated artefacts, refinements, review decisions and review notes.",
      "Device and browser information, IP address, timestamps, diagnostic events, error logs, security events, and approximate location derived from an IP address.",
      "Transformation activity, including job status, output types, timestamps and review decisions. Workspace Analytics displays job, artefact and review counts.",
      "During demo operation, Content Forge may store working state locally in your browser using localStorage. Clearing browser data or using another device may remove or make this data unavailable.",
    ],
  },
  {
    title: "3. How we use personal data",
    body: [
      "Provide, secure, maintain, and troubleshoot Content Forge.",
      "Authenticate operators and provide access to the workspace.",
      "Prepare source material, generate requested deliverables, refine outputs and record operator reviews.",
      "Prepare content for operator review, copying and download. An approval in Review Queue records readiness; it does not publish content.",
      "Retain each transformation’s controls so later refinements use the same configuration.",
      "Measure product performance, prevent abuse, maintain audit records, and improve reliability.",
      "Respond to support, privacy, security, and legal requests.",
      "Comply with applicable law and enforce our agreements.",
    ],
  },
  {
    title: "4. Legal grounds and consent",
    body: [
      "We process personal data when necessary to provide a service you request, based on your consent, for legitimate interests such as security and product reliability where permitted, or to comply with legal obligations. Where consent is the applicable basis, you may withdraw it at any time. Withdrawal does not affect processing already lawfully completed.",
      "For users in India, we aim to process digital personal data consistently with the Digital Personal Data Protection Act, 2023 and applicable rules as they come into force. Nothing in this Policy limits rights available under applicable law.",
    ],
  },
  {
    title: "5. AI-assisted processing",
    body: [
      "Content Forge may use AI service providers to process prompts, drafts, preferences, and other information needed to generate requested outputs. We will configure providers and data flows according to the features offered and our agreements with them. Do not submit highly sensitive information that is unnecessary for the task.",
      "AI output may be incomplete or inaccurate. Users should review generated content, factual claims, recommendations, and external actions before relying on or publishing them.",
    ],
  },
  {
    title: "6. Publishing and external actions",
    body: [
      "The content-transformation workspace provides previews and exports. It does not connect publishing accounts or publish generated content. Operators control any use of exported deliverables.",
      "Content Forge does not support spam, fake engagement, deceptive automation, CAPTCHA bypasses, unauthorized scraping, mass messaging, or attempts to evade platform protections.",
    ],
  },
  {
    title: "7. How we share information",
    body: [
      "We may share personal data only as reasonably necessary with infrastructure and hosting providers; AI service providers when an AI-powered feature is used; professional advisers, auditors, insurers, or potential transaction counterparties subject to appropriate confidentiality obligations; and government authorities, courts, or other parties when disclosure is required by law or reasonably necessary to protect rights, safety, security, or the integrity of the service.",
      "We do not sell or rent personal data. We do not share personal data for third-party behavioural advertising.",
    ],
  },
  {
    title: "8. Data storage, retention, and deletion",
    body: [
      "Data may be stored in your browser, in Content Forge's managed databases, or by service providers acting for us. We retain personal data only for as long as reasonably necessary to provide Content Forge, satisfy the purposes described in this Policy, maintain security and audit records, resolve disputes, and comply with legal obligations.",
      "Use History to delete saved transformations, including their sources, artefacts and review decisions. Settings exports the loaded workspace. Signing out ends the session but does not clear browser data. Audit records and provider-side retention are separate from job deletion.",
    ],
  },
  {
    title: "9. Security",
    body: [
      "We use reasonable technical and organizational safeguards appropriate to the nature of the data, including access controls, secret management, encrypted network transport, restricted production access, validation, logging, and user approval for external actions. No online service or storage system can guarantee absolute security.",
      "Never place passwords, OAuth client secrets, private API keys, or other credentials into public repositories, ordinary prompts, or publicly accessible fields.",
    ],
  },
  {
    title: "10. International processing",
    body: [
      "Content Forge and its service providers may process information in countries other than your own. Where required, we will use appropriate contractual or legal safeguards for international transfers. Third-party platforms may independently transfer data under their own policies.",
    ],
  },
  {
    title: "11. Your choices and rights",
    body: [
      "Depending on applicable law, you may have rights to access, correct, delete, export, withdraw consent, object to certain processing, raise a grievance, and, where applicable, nominate another person to exercise rights on your behalf.",
      "To exercise a privacy right, email drufiyai0001@gmail.com from the address associated with your account. We may request reasonable verification before acting.",
    ],
  },
  {
    title: "12. Cookies and local storage",
    body: [
      "Content Forge may use essential cookies or similar technologies for authentication, security, preferences, and service operation. Demo mode currently uses browser localStorage to preserve working state. If non-essential analytics or advertising technologies are introduced, we will provide any notice or consent controls required by law before using them.",
    ],
  },
  {
    title: "13. Children's privacy",
    body: [
      "Content Forge is not directed to children under 18. We do not knowingly collect personal data from children under 18. If you believe a child has provided personal data, contact us so we can investigate and take appropriate action.",
    ],
  },
  {
    title: "14. Third-party links and services",
    body: [
      "Content Forge may display source links and generated download links to websites or services not controlled by Drufiy. We are not responsible for the privacy, security, availability, or content of third-party services. Review their policies before providing information or authorizing access.",
    ],
  },
  {
    title: "15. Changes to this Policy",
    body: [
      "We may update this Policy to reflect product, legal, security, or operational changes. The updated version will display a revised effective date. Where required, we will provide additional notice or request renewed consent.",
    ],
  },
  {
    title: "16. Contact and grievance requests",
    body: [
      "Data Fiduciary / Operator: Drufiy A.I. Private Limited",
      "Product: Content Forge",
      "Privacy and grievance email: drufiyai0001@gmail.com",
      "Please use the subject line 'Content Forge Privacy Request' and describe the request sufficiently for us to identify the relevant account and respond.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#1e1d1a]">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-14">
        <header className="border-b border-black/10 pb-8">
          <Link
            href="/"
            className="text-sm font-medium opacity-70 transition hover:opacity-100"
          >
            Content Forge
          </Link>
          <h1 className="mt-8 text-4xl font-semibold tracking-normal sm:text-5xl">
            Content Forge Privacy Policy
          </h1>
          <p className="mt-4 text-sm leading-6 opacity-70">
            Effective date: 9 August 2026 | Last updated: 10 September 2026
          </p>
          <p className="mt-6 max-w-3xl text-base leading-8 opacity-80">
            Content Forge is operated by Drufiy A.I. Private Limited
            (&quot;Drufiy&quot;, &quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;). This Privacy Policy explains how Content Forge
            collects, uses, stores, shares, and protects personal data when you
            use its website, applications, AI-assisted transformation tools, and
            configured generation services.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-lg border border-black/10 bg-white/60 p-5 shadow-sm"
            >
              <h2 className="text-xl font-semibold tracking-normal">
                {section.title}
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-7 opacity-80">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
