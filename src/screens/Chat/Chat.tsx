import { Images } from '@/src/assets/images'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Text, View } from 'react-native'
import { styles } from './styles'

export default function Chat() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Image 
      source={Images.ChatIcon}
      style={styles.CommingImage}
      />
      <Text style={[styles.Text,{marginVertical:10}]}>{t("Chat Coming Soon")}</Text>
      <Text style={styles.darkText}>We’re building something exciting.</Text>
      <Text style={styles.darkText}>You’ll be able to chat here shortly.</Text>
    </View>
  )
}