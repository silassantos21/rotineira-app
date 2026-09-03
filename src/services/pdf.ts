import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'

export async function exportHtmlAsPdf(html: string, filename: string, dialogTitle: string): Promise<void> {
  const available = await Sharing.isAvailableAsync()
  if (!available) {
    throw new Error('Compartilhamento não está disponível neste dispositivo.')
  }
  // Solicita base64 para evitar leitura cross-sandbox no Android (Expo Go).
  const { base64 } = await Print.printToFileAsync({ html, base64: true })
  if (!base64) throw new Error('PDF vazio retornado pelo expo-print.')
  const dest = `${FileSystem.cacheDirectory}${filename}`
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  })
  await Sharing.shareAsync(dest, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  })
}
