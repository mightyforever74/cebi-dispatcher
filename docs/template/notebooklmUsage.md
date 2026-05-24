1. check what notebooklm-py actually does and how to use it — I don't want to guess at the API.
2. installation history :
     a.  pip is working --version pip 26.1.1  from C:\Python310\lib\site-packages\pip (python 3.10)
     b. action to check what notebooklm-py actually does and how to use it:  
   c.  Notebook created and active
   d. A few things  can be achivable next:
powershell# Generate a mind map of the sources
notebooklm generate mind-map --wait

# Generate flashcards for studying
notebooklm generate flashcards --quantity more --wait

# Generate a quiz
notebooklm generate quiz --difficulty hard --wait

# Add more sources to enrich the answers
notebooklm source add "https://en.wikipedia.org/wiki/Machine_learning"

# Ask follow-up questions (it remembers conversation context — see "Resumed conversation: 53240ac2...")
notebooklm ask "Which of these themes is most relevant to fleet management software?"

   e.  find out what's actually available:
powershellnotebooklm --help
notebooklm artifact --help
notebooklm generate audio --help
notebooklm artifact list

  f. TulipFleet için pratik bir kullanım fikri — Hollanda lojistik şirketleri için outreach yaparken, hedef şirketler hakkında topladığın bilgiyi (web sitesi, basın bültenleri, LinkedIn yazıları) bir notebook'a atıp notebooklm ask ile spesifik sorular sorabilirsin. Örneğin:
powershellnotebooklm create "Dobbe Transport Research"
notebooklm use <yeni-id>
notebooklm source add "https://www.dobbe-transport.nl"
notebooklm source add "./dobbe-press-release.pdf"
notebooklm ask "Dobbe Transport'un fleet management konusunda mevcut çözümleri ve potansiyel ihtiyaçları neler?"
