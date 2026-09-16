"use client";

import { useEffect, useState } from "react";
import { getStaticWordIrab } from "./QuranPortalStaticStore";

function blankRecord(wordDetail) {
  const verseKey = String(wordDetail?.verseKey || "");
  const [surahText, ayahText] = verseKey.split(":");

  return {
    id: `word-irab-${verseKey.replace(":", "-")}-${Number(wordDetail?.wordNumber) || 0}-${Number(wordDetail?.segmentNumber) || 0}`,
    verseKey,
    surahNumber: Number(surahText) || 0,
    ayahNumber: Number(ayahText) || 0,
    wordNumber: Number(wordDetail?.wordNumber) || 0,
    segmentNumber: Number(wordDetail?.segmentNumber) || 0,
    wordArabic: wordDetail?.word?.wordArabic || "",
    transliteration: wordDetail?.word?.transliteration || "",
    conclusionArabic: "",
    conclusionEnglish: "",
    shared: {
      wordClass: "",
      syntacticFunctionArabic: "",
      syntacticFunctionEnglish: "",
      grammaticalFamilyArabic: "",
      grammaticalFamilyEnglish: "",
      declension: "",
      binaSign: "",
      irabState: "",
      irabSign: "",
      expressionType: "",
      mahallArabic: "",
      mahallEnglish: "",
      grammaticalEffectArabic: "",
      grammaticalEffectEnglish: "",
      propertiesArabic: "",
      propertiesEnglish: "",
      attachmentArabic: "",
      attachmentEnglish: "",
      classifications: [],
      agreedArabic: "",
      agreedEnglish: "",
    },
    opinions: [],
    updatedAt: "",
  };
}

export default function QuranWordIrabPanel({ wordDetail, editing = false, canEdit = false }) {
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const verseKey = String(wordDetail?.verseKey || "");
  const wordNumber = Number(wordDetail?.wordNumber) || 0;
  const segmentNumber = Number(wordDetail?.segmentNumber) || 0;

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setMessage("");

    Promise.resolve(getStaticWordIrab(verseKey, wordNumber, segmentNumber))
      .then((record) => {
        if (cancelled) return;
        setRecord(record || null);
        setDraft(record || null);
      })
      .catch((error) => { if (!cancelled) setMessage(error?.message || "Could not load word Iʿrāb."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
    };
  }, [verseKey, wordNumber, segmentNumber]);

  useEffect(() => {
    if (!editing) return;

    // Keep every previously saved structured field in the background.
    // The simplified editor only changes the Arabic/English free-text fields.
    setDraft(
      record
        ? JSON.parse(JSON.stringify(record))
        : blankRecord(wordDetail),
    );
    setMessage("");
  }, [editing]);

  async function save() {
    setMessage("Public Study mode is read-only.");
  }

  async function remove() {
    setMessage("Public Study mode is read-only.");
  }

  if (loading) {
    return (
      <section className="qmr-study-dialog-section">
        <p className="qmr-study-muted">Loading Iʿrāb…</p>
      </section>
    );
  }

  if (editing) {
    const value = draft || blankRecord(wordDetail);

    return (
      <section className="qmr-study-dialog-section qmr-irab-simple-editor">
        <div className="qmr-irab-simple-head">
          <div>
            <span className="qmr-study-small-label">Word Iʿrāb</span>
          </div>

          <div className="qmr-irab-simple-actions">
            {record ? (
              <button
                type="button"
                className="qmr-irab-simple-remove"
                onClick={remove}
                disabled={saving}
              >
                Remove
              </button>
            ) : null}

            <button
              type="button"
              className="qmr-source-save qmr-irab-simple-save"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Iʿrāb"}
            </button>
          </div>
        </div>

        <label className="qmr-irab-simple-field qmr-irab-simple-arabic">
          <span>Arabic Iʿrāb</span>
          <textarea
            dir="rtl"
            lang="ar"
            rows={7}
            value={String(value.conclusionArabic || "")}
            onChange={(event) =>
              setDraft({
                ...value,
                conclusionArabic: event.target.value,
              })
            }
            placeholder="مثال: ظرف لما يستقبل من الزمان، مبني على السكون في محل نصب، متضمن معنى الشرط غالباً، خافض لشرطه، متعلق بجوابه."
          />
        </label>

        <label className="qmr-irab-simple-field">
          <span>
            English <small>optional</small>
          </span>
          <textarea
            rows={5}
            value={String(value.conclusionEnglish || "")}
            onChange={(event) =>
              setDraft({
                ...value,
                conclusionEnglish: event.target.value,
              })
            }
            placeholder="Optional English rendering of the Arabic Iʿrāb."
          />
        </label>

        <p className="qmr-irab-simple-note">
          Arabic is the primary Iʿrāb. Existing structured data is preserved in
          the saved record but no longer needs to be filled out here.
        </p>

        {message ? <p className="qmr-inline-message">{message}</p> : null}
      </section>
    );
  }

  if (!record || !String(record.conclusionArabic || "").trim()) {
    return (
      <section className="qmr-study-dialog-section qmr-word-empty">
        <strong>No word-level Iʿrāb yet</strong>
        <p>{canEdit ? "Select Edit and write the Iʿrāb directly in Arabic." : "No Iʿrāb has been added for this word yet."}</p>
      </section>
    );
  }

  return (
    <section className="qmr-study-dialog-section qmr-irab-simple-display">
      <div className="qmr-irab-simple-arabic-display" dir="rtl" lang="ar">
        {record.conclusionArabic}
      </div>

      {String(record.conclusionEnglish || "").trim() ? (
        <div className="qmr-irab-simple-english-display">
          {record.conclusionEnglish}
        </div>
      ) : null}

      {message ? <p className="qmr-inline-message">{message}</p> : null}
    </section>
  );
}
