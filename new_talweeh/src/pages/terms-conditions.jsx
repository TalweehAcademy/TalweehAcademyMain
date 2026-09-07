import { Link } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import '../terms-conditions.css'

const Section = ({ number, title, children }) => (
  <section className="legal-section" id={`section-${number}`}>
    <div className="legal-section-heading">
      <span>{number}</span>
      <h2>{title}</h2>
    </div>
    <div className="legal-section-body">{children}</div>
  </section>
)

export default function TermsConditionsPage() {
  return (
    <div className="academy-legal-page">
      <PageHeader />

      <main>
        <section className="legal-hero">
          <div className="legal-hero-inner">
            <p className="legal-eyebrow">Talweeh Academy · Policies</p>
            <h1>Terms &amp; Conditions</h1>
            <p className="legal-effective">Effective Date: January 1, 2026</p>
            <p className="legal-intro">
              These Terms &amp; Conditions govern access to and use of the courses,
              services, and content offered by Talweeh Academy.
            </p>
          </div>
        </section>

        <section className="legal-layout">
          <aside className="legal-toc" aria-label="Terms and Conditions contents">
            <p>On this page</p>
            <nav>
              <a href="#section-1">1. Definitions</a>
              <a href="#section-2">2. Registration &amp; Access</a>
              <a href="#section-3">3. Course Content &amp; Intellectual Property</a>
              <a href="#section-4">4. Conduct &amp; Etiquette</a>
              <a href="#section-5">5. Payments, Fees &amp; Refunds</a>
              <a href="#section-6">6. Financial Assistance &amp; Scholarships</a>
              <a href="#section-7">7. Course Modifications &amp; Cancellations</a>
              <a href="#section-8">8. Termination of Access</a>
              <a href="#section-9">9. Disclaimer &amp; Limitation of Liability</a>
              <a href="#section-10">10. Educational Purpose Disclaimer</a>
              <a href="#section-11">11. Privacy &amp; Data Protection</a>
              <a href="#section-12">12. Assumption of Risk</a>
              <a href="#section-13">13. Governing Law</a>
              <a href="#section-14">14. Amendments</a>
              <a href="#contact">Contact Us</a>
            </nav>
          </aside>

          <article className="legal-document">
            <div className="legal-opening">
              <p>
                Welcome to Talweeh Academy. These Terms &amp; Conditions (“Terms”) govern
                your access to and use of the courses, services, and content offered by
                Talweeh Academy (“Talweeh Academy,” “we,” “us,” or “our”). By accessing
                our website, registering for a course, or using any of our services, you
                confirm that you have read, understood, and agree to be bound by these Terms.
              </p>
              <p>
                Nothing in these Terms limits any rights you may have under the Consumer
                Protection Act, 2002 (Ontario) or other applicable Canadian laws.
              </p>
            </div>

            <Section number="1" title="Definitions">
              <ul>
                <li>
                  <strong>“Student,” “You,” or “Your”</strong> refers to any individual
                  who registers for, accesses, or participates in Talweeh Academy courses
                  or services.
                </li>
                <li>
                  <strong>“Course Materials”</strong> refers to all videos, lessons,
                  recordings, documents, notes, assessments, and digital content provided
                  by Talweeh Academy in any format.
                </li>
              </ul>
            </Section>

            <Section number="2" title="Registration & Access">
              <ol>
                <li>
                  <strong>Eligibility:</strong> Students must be 18 years of age or older
                  to register independently. Students under the age of 18 must have
                  verifiable parental or legal guardian consent to enroll and participate.
                  By enrolling a minor, the parent or guardian accepts full responsibility
                  for the minor’s participation and compliance with these Terms.
                </li>
                <li>
                  <strong>Account Security:</strong> Students are responsible for
                  maintaining the confidentiality of their login credentials and for all
                  activity conducted through their account. Sharing accounts, login
                  information, or course access with others is strictly prohibited and may
                  result in termination.
                </li>
                <li>
                  <strong>Access Rights:</strong> Access to courses and materials is granted
                  upon successful registration and full payment (or approved payment plan)
                  and is limited to the duration and scope specified at the time of purchase.
                </li>
              </ol>
            </Section>

            <Section number="3" title="Course Content & Intellectual Property">
              <ol>
                <li>
                  <strong>Permitted Use:</strong> Course Materials are provided for
                  personal, educational, and non-commercial use only. Downloading is
                  permitted solely where explicitly allowed and strictly for personal study.
                </li>
                <li>
                  <strong>Intellectual Property:</strong> All Course Materials are owned by
                  or licensed to Talweeh Academy and are protected under Canadian copyright
                  law and applicable intellectual property legislation. Students may not
                  reproduce, distribute, modify, sell, or publicly share any Course
                  Materials without prior written permission.
                </li>
                <li>
                  <strong>Recordings:</strong> Lessons may be streamed or viewed as
                  provided. Downloading, recording, screen-capturing, or distributing
                  lessons or live sessions is prohibited unless expressly authorized in writing.
                </li>
              </ol>
            </Section>

            <Section number="4" title="Conduct & Etiquette">
              <ul>
                <li>
                  Students are expected to conduct themselves respectfully and in
                  accordance with Islamic values and appropriate academic etiquette.
                </li>
                <li>
                  Harassment, abusive language, discrimination, or disruptive behaviour
                  will not be tolerated.
                </li>
                <li>
                  Communication during live sessions, forums, or messaging platforms must
                  remain respectful and appropriate.
                </li>
                <li>
                  Recording, photographing, or capturing screenshots of instructors,
                  students, or personal data without explicit consent is strictly prohibited.
                </li>
                <li>
                  Talweeh Academy reserves the right to take corrective action, including
                  removal from sessions or termination of access, for violations of this section.
                </li>
              </ul>
            </Section>

            <Section number="5" title="Payments, Fees & Refunds">
              <ul>
                <li>
                  <strong>Payment Terms:</strong> Course fees are payable at the time of
                  registration unless an approved payment plan is in place. Failure to
                  complete payment obligations may result in suspension or termination of access.
                </li>
                <li>
                  <strong>Refund Policy:</strong> Subject to applicable Ontario consumer
                  protection laws, Talweeh Academy follows the refund structure below:
                  <ul>
                    <li>
                      Refund requests must be submitted in writing (via email). Approved
                      refunds will be returned to the original payment method within 5–10
                      business days.
                    </li>
                    <li>
                      Refunds are only given if Talweeh Academy approves the reason
                      requested by the student.
                    </li>
                  </ul>
                </li>
                <li>
                  This policy does not affect any statutory cancellation rights provided
                  under Ontario law.
                </li>
              </ul>
            </Section>

            <Section number="6" title="Financial Assistance & Scholarships">
              <p>
                Talweeh Academy may offer scholarships, discounts, or financial assistance
                at its discretion. Availability, eligibility criteria, and conditions may
                change and will be communicated separately. Financial assistance does not
                alter these Terms.
              </p>
            </Section>

            <Section number="7" title="Course Modifications & Cancellations">
              <ul>
                <li>
                  <strong>Changes:</strong> Talweeh Academy reserves the right to modify
                  course content, schedules, instructors, or delivery formats as necessary.
                </li>
                <li>
                  <strong>Cancellations:</strong> If a course is canceled by Talweeh Academy
                  before it begins, enrolled students will be entitled to a full refund of
                  fees paid for that course.
                </li>
                <li>
                  Talweeh Academy reserves the right to remove the content of any given
                  course if the content is updated or requires revising.
                </li>
              </ul>
            </Section>

            <Section number="8" title="Termination of Access">
              <p>
                Talweeh Academy may suspend or terminate student access, without refund, if a student:
              </p>
              <ul>
                <li>Violates these Terms</li>
                <li>Engages in misconduct or academic dishonesty</li>
                <li>Disrupts the learning environment</li>
                <li>Uses Course Materials in an unauthorized manner</li>
              </ul>
              <p>
                Termination decisions will be made reasonably and in compliance with applicable law.
              </p>
            </Section>

            <Section number="9" title="Disclaimer & Limitation of Liability">
              <ul>
                <li>
                  <strong>Educational Disclaimer:</strong> Talweeh Academy does not
                  guarantee specific academic, religious, or personal outcomes. Results
                  depend on individual participation, effort, and circumstances.
                </li>
                <li>
                  <strong>Limitation of Liability:</strong> To the maximum extent permitted
                  by law, Talweeh Academy shall not be liable for any indirect, incidental,
                  special, or consequential damages arising from the use or inability to
                  use its services or Course Materials. Nothing in these Terms excludes
                  liability where exclusion is prohibited under Ontario or Canadian law.
                </li>
              </ul>
            </Section>

            <Section number="10" title="Educational Purpose Disclaimer">
              <p>
                Talweeh Academy is an educational organization providing religious and
                academic instruction for informational and learning purposes only. Talweeh
                Academy does not promote or endorse any specific ideology, political agenda,
                or sectarian viewpoint.
              </p>
              <p>
                Talweeh Academy does not offer medical advice, mental health services,
                counseling, therapy, legal advice, or professional services of any kind.
                All content, discussions, and materials are purely educational and should
                not be relied upon as a substitute for professional advice.
              </p>
              <p>
                Any decisions, actions, or outcomes resulting from participation in Talweeh
                Academy’s programs are the sole responsibility of the participant. Talweeh
                Academy is not responsible for, nor affiliated with, any personal decisions
                made by students based on the educational content provided.
              </p>
            </Section>

            <Section number="11" title="Privacy & Data Protection">
              <p>
                Personal information is collected, used, and stored in accordance with our
                Privacy Policy and applicable Canadian privacy legislation, including
                PIPEDA. By using our services, you consent to such collection and use.
              </p>
            </Section>

            <Section number="12" title="Assumption of Risk">
              <p>
                By participating in Talweeh Academy programs, students voluntarily assume
                all reasonable risks associated with online learning, including technical
                disruptions, differences in instructional style, and personal interpretation
                of educational material.
              </p>
            </Section>

            <Section number="13" title="Governing Law">
              <p>
                These Terms shall be governed by and construed in accordance with the laws
                of the Province of Ontario and the laws of Canada applicable therein.
              </p>
            </Section>

            <Section number="14" title="Amendments">
              <p>
                Talweeh Academy may update these Terms at any time. Continued use of our
                courses after changes have been posted constitutes acceptance of those
                updated Terms.
              </p>
            </Section>

            <section className="legal-contact" id="contact">
              <p className="legal-eyebrow">Questions about these terms?</p>
              <h2>Contact Us</h2>
              <p>
                If you have questions about these Terms &amp; Conditions, refunds, or
                policies, please contact us at:
              </p>
              <a href="mailto:info@talweehacademy.com">info@talweehacademy.com</a>
              <Link to="/contact-us" className="legal-contact-button">Contact Talweeh Academy</Link>
            </section>
          </article>
        </section>
      </main>

      <PageFooter />
    </div>
  )
}
