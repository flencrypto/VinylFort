# ProGuard rules for VinylVault Android TWA

# Keep TWA/AndroidBrowserHelper classes
-keep class com.google.androidbrowserhelper.** { *; }
-keep class androidx.browser.** { *; }

# Keep FileProvider
-keep class androidx.core.content.FileProvider { *; }

# General Android rules
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
