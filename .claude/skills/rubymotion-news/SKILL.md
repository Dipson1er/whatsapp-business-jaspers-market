---
name: rubymotion-news
description: RubyMotion release history (versions 1.0 to 4.17) from the official HipByte/RubyMotion NEWS changelog. Use when the user asks which RubyMotion version added, fixed or changed a feature, when an option of `rake` (spec, build, device, archive...) or `motion` appeared, about iOS/OSX/watchOS/tvOS/Android support per release, or when upgrading or debugging a RubyMotion project against a given version.
---

# RubyMotion NEWS

The full changelog is in `references/NEWS.txt` (about 3,000 lines, newest release first).
Source: https://github.com/HipByte/RubyMotion/blob/master/NEWS

## Layout of the file

- Each release starts with a header line `= RubyMotion X.Y =`.
- Each entry is a bullet `  * ...`, often prefixed with a platform tag:
  `[iOS]`, `[OSX]`, `[watchOS]`, `[tvOS]`, `[Android]`, or a combination such as `[iOS, OSX]`.
  Entries without a tag apply to every platform.

## How to use it

Do not load the whole file. Search it:

- Find a feature or bug: `grep -n -i "<keyword>" references/NEWS.txt`
- Find which release an entry belongs to: take the line number of the hit and look
  for the closest `= RubyMotion` header above it
  (`awk 'NR<=LINE && /^= RubyMotion/ {h=$0} END {print h}' references/NEWS.txt`).
- List all releases: `grep -n '^= RubyMotion' references/NEWS.txt`
- Read one release: read from its header line to the next header.
- Platform-specific changes: `grep -n '\[Android' references/NEWS.txt` (or `\[iOS`, etc.).

When answering, cite the RubyMotion version (and quote the entry) so the user can check it.
The changelog stops at 4.17; for later versions say that this file does not cover them.
