export const metadata = {
  title: 'WhatsApp Audio Transcription - n8n Workflow',
  description: 'Generate and export n8n workflow for transcribing WhatsApp audio messages to text',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
