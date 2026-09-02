// src/components/features/course/CertificatePDF.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Circle,
  Font,
} from "@react-pdf/renderer";

/* ------------------------------------------------------------------ */
/*  Fonts — Spectral (elegant serif) for headings/body, Great Vibes    */
/*  (script) for the recipient name and signature, Helvetica for       */
/*  small functional labels where legibility matters more than flair.  */
/* ------------------------------------------------------------------ */
Font.register({
  family: "Spectral",
  fonts: [
    { src: "https://raw.githubusercontent.com/google/fonts/main/ofl/spectral/Spectral-Regular.ttf" },
    { src: "https://raw.githubusercontent.com/google/fonts/main/ofl/spectral/Spectral-Italic.ttf", fontStyle: "italic" },
    { src: "https://raw.githubusercontent.com/google/fonts/main/ofl/spectral/Spectral-Medium.ttf", fontWeight: 500 },
    { src: "https://raw.githubusercontent.com/google/fonts/main/ofl/spectral/Spectral-SemiBold.ttf", fontWeight: 600 },
    { src: "https://raw.githubusercontent.com/google/fonts/main/ofl/spectral/Spectral-Bold.ttf", fontWeight: 700 },
  ],
});

Font.register({
  family: "Great Vibes",
  fonts: [
    { src: "https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf" },
  ],
});

/* ------------------------------------------------------------------ */
/*  Palette                                                            */
/* ------------------------------------------------------------------ */
const INK = "#1F2A24";
const MUTED = "#6E7A72";
const ACCENT = "#0F9D6F";
const ACCENT_DARK = "#0B7C58";
const SIDEBAR_BG = "#EEF6F1";
const PAPER = "#FFFFFF";
const HAIRLINE = "#E4E7E2";

/* ------------------------------------------------------------------ */
/*  Nexus mark — native react-pdf Svg, no rasterized image needed      */
/* ------------------------------------------------------------------ */
function NexusMark({ size = 34 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 40 40" width={size} height={size}>
      <Path
        d="M20 4C20 4 27 9 27 17C27 21 24 24 20 24C16 24 13 21 13 17C13 9 20 4 20 4Z"
        fill={ACCENT}
      />
      <Path
        d="M20 4C20 4 27 9 27 17C27 21 24 24 20 24C16 24 13 21 13 17C13 9 20 4 20 4Z"
        fill={ACCENT}
        opacity={0.65}
        transform="rotate(120 20 20)"
      />
      <Path
        d="M20 4C20 4 27 9 27 17C27 21 24 24 20 24C16 24 13 21 13 17C13 9 20 4 20 4Z"
        fill={ACCENT}
        opacity={0.35}
        transform="rotate(240 20 20)"
      />
      <Circle cx={20} cy={20} r={4.5} fill="#FFFFFF" />
      <Circle cx={20} cy={20} r={4.5} fill="none" stroke={ACCENT_DARK} strokeWidth={1} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Seal medal — a disc over two crossed ribbon tails.                 */
/* ------------------------------------------------------------------ */
function SealMedal({ size = 108 }: { size?: number }) {
  const half = size / 2;
  return (
    <Svg viewBox={`${-half} ${-half} ${size} ${size}`} width={size} height={size}>
      <Path d="M -21,4 L -7,4 L -7,52 L -14,41 L -21,52 Z" fill={ACCENT_DARK} opacity={0.9} />
      <Path d="M 21,2 L 7,2 L 7,50 L 14,39 L 21,50 Z" fill={ACCENT} opacity={0.9} />

      <Circle cx={0} cy={-8} r={27} fill="#FFFFFF" stroke={ACCENT_DARK} strokeWidth={1.5} />
      <Circle cx={0} cy={-8} r={22} fill="none" stroke={ACCENT} strokeWidth={0.75} />

      <Circle cx={0} cy={-8} r={5.5} fill={ACCENT} />
      <Circle cx={0} cy={-8} r={5.5} fill="none" stroke={ACCENT_DARK} strokeWidth={0.75} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const SIDEBAR_W = 176;

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    fontFamily: "Helvetica",
  },
  frame: {
    flex: 1,
    flexDirection: "row",
    margin: 22,
    border: "1px solid " + HAIRLINE,
  },

  /* ---------------- Sidebar ---------------- */
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: SIDEBAR_BG,
    paddingVertical: 34,
    paddingHorizontal: 22,
    justifyContent: "space-between",
    alignItems: "center",
    borderRight: "1px solid " + HAIRLINE,
  },
  sidebarTop: { alignItems: "center" },
  wordmark: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: INK,
    letterSpacing: 3,
    marginTop: 8,
  },
  tagline: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: MUTED,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 3,
    textAlign: "center",
  },
  sidebarDivider: {
    width: 26,
    height: 1.5,
    backgroundColor: ACCENT,
    marginVertical: 26,
  },
  sealCaption: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: ACCENT_DARK,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 1.5,
  },
  sidebarBottom: { alignItems: "center" },
  certId: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: MUTED,
    letterSpacing: 0.8,
    textAlign: "center",
    marginBottom: 4,
  },
  verifyUrl: {
    fontFamily: "Helvetica",
    fontSize: 6.5,
    color: ACCENT_DARK,
    letterSpacing: 0.4,
    textAlign: "center",
  },

  /* ---------------- Main content ---------------- */
  main: {
    flex: 1,
    paddingHorizontal: 46,
    paddingVertical: 40,
  },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyebrowDiamond: {
    width: 6,
    height: 6,
    backgroundColor: ACCENT,
    marginRight: 8,
    transform: "rotate(45deg)",
  },
  eyebrow: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: ACCENT_DARK,
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  title: {
    fontFamily: "Spectral",
    fontWeight: 600,
    fontSize: 37,
    color: INK,
    marginTop: 12,
    letterSpacing: 0.3,
  },

  presentedTo: {
    fontFamily: "Spectral",
    fontStyle: "italic",
    fontSize: 12,
    color: MUTED,
    marginTop: 26,
  },

  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  recipientName: {
    fontFamily: "Great Vibes",
    fontSize: 52,
    color: INK,
  },
  recipientFlourish: {
    flex: 1,
    height: 0.75,
    backgroundColor: HAIRLINE,
    marginLeft: 18,
    marginTop: 14,
  },

  courseIntro: {
    fontFamily: "Spectral",
    fontStyle: "italic",
    fontSize: 12,
    color: MUTED,
    marginTop: 20,
  },
  courseName: {
    fontFamily: "Spectral",
    fontWeight: 700,
    fontSize: 21,
    color: INK,
    marginTop: 6,
    maxWidth: 430,
  },
  courseDesc: {
    fontFamily: "Spectral",
    fontWeight: 400,
    fontSize: 10.5,
    color: MUTED,
    marginTop: 10,
    maxWidth: 420,
    lineHeight: 1.55,
  },

  footer: {
    position: "absolute",
    left: 46,
    right: 46,
    bottom: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerBlock: { alignItems: "flex-start" },
  footerBlockRight: { alignItems: "flex-end" },
  footerValue: {
    fontFamily: "Spectral",
    fontStyle: "italic",
    fontSize: 14,
    color: INK,
  },
  footerValueScript: {
    fontFamily: "Great Vibes",
    fontSize: 24,
    color: INK,
  },
  footerRule: {
    width: 150,
    height: 0.75,
    backgroundColor: INK,
    marginTop: 6,
    marginBottom: 5,
  },
  footerLabel: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: MUTED,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
interface CertificatePDFProps {
  userName: string;
  courseTitle: string;
  completedAt: Date;
  certificateId: string;
  communityName?: string;
  instructorName?: string;
}

export function CertificatePDF({
  userName,
  courseTitle,
  completedAt,
  certificateId,
  communityName = "Nexus Learning Platform",
  instructorName = "Community Owner",
}: CertificatePDFProps) {
  const formattedDate = completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          {/* ---------------- Sidebar ---------------- */}
          <View style={styles.sidebar}>
            <View style={styles.sidebarTop}>
              <NexusMark size={40} />
              <Text style={styles.wordmark}>NEXUS</Text>
              <Text style={styles.tagline}>{communityName}</Text>

              <View style={styles.sidebarDivider} />

              <SealMedal size={108} />
              <Text style={styles.sealCaption}>Official{"\n"}Seal</Text>
            </View>

            <View style={styles.sidebarBottom}>
              <Text style={styles.certId}>CERT. NO. {certificateId}</Text>
              <Text style={styles.verifyUrl}>
                nexus.com/verify/{certificateId}
              </Text>
            </View>
          </View>

          {/* ---------------- Main content ---------------- */}
          <View style={styles.main}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDiamond} />
              <Text style={styles.eyebrow}>Certificate of Completion</Text>
            </View>
            <Text style={styles.title}>Awarded With Distinction</Text>

            <Text style={styles.presentedTo}>This certifies that</Text>
            <View style={styles.recipientRow}>
              <Text style={styles.recipientName}>{userName}</Text>
              <View style={styles.recipientFlourish} />
            </View>

            <Text style={styles.courseIntro}>
              has successfully completed the course
            </Text>
            <Text style={styles.courseName}>{courseTitle}</Text>
            <Text style={styles.courseDesc}>
              In recognition of the dedication, discipline, and skill
              demonstrated throughout the program, this certificate is
              awarded on behalf of {communityName}.
            </Text>

            <View style={styles.footer}>
              <View style={styles.footerBlock}>
                <Text style={styles.footerValue}>{formattedDate}</Text>
                <View style={styles.footerRule} />
                <Text style={styles.footerLabel}>Date Completed</Text>
              </View>
              <View style={styles.footerBlockRight}>
                <Text style={styles.footerValueScript}>{instructorName}</Text>
                <View style={styles.footerRule} />
                <Text style={styles.footerLabel}>Instructor / Director</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}