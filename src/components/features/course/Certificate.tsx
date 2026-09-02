// src/components/features/course/Certificate.tsx
"use client";

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#ffffff",
  },
  border: {
    border: "2px solid #10b981",
    padding: 30,
    borderRadius: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    color: "#10b981",
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 10,
    color: "#4b5563",
  },
  name: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    color: "#1f2937",
  },
  courseName: {
    fontSize: 22,
    textAlign: "center",
    marginTop: 10,
    color: "#374151",
  },
  date: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 30,
    color: "#6b7280",
  },
  footer: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 40,
    color: "#9ca3af",
  },
  seal: {
    width: 80,
    height: 80,
    marginHorizontal: "auto",
    marginTop: 20,
  },
});

interface CertificateProps {
  userName: string;
  courseTitle: string;
  completedAt: Date;
  certificateId: string;
}

export function Certificate({ userName, courseTitle, completedAt, certificateId }: CertificateProps) {
  const formattedDate = completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.title}>Certificate of Completion</Text>
          <Text style={styles.subtitle}>This certificate is awarded to</Text>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.courseName}>For successfully completing the course</Text>
          <Text style={[styles.courseName, { fontWeight: "bold", marginTop: 5 }]}>
            {courseTitle}
          </Text>
          <Text style={styles.date}>Completed on {formattedDate}</Text>
          <Text style={styles.footer}>Certificate ID: {certificateId}</Text>
        </View>
      </Page>
    </Document>
  );
}