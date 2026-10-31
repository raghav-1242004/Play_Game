/* Rules shown before every game: English + Hinglish.  RULES[id] = { en:[...], hi:[...] } */
const RULES = {
  tictactoe: {
    en: ["Two players take turns placing ❌ / ⭕ on a 3×3 board.", "Make 3 in a row (across, down or diagonal) to win.", "If all 9 squares fill up with no line, it is a draw.", "Tap an empty square on your turn."],
    hi: ["Do players baari-baari se 3×3 board par apna mark lagate hain.", "Seedhi, aadi ya tirchi line mein 3 mark milte hi aap jeet jaate ho.", "Agar 9 square bhar jaayein aur line na bane to draw hoga.", "Apni baari par khali square par tap karo."]
  },
  ludo: {
    en: ["Each player has 4 tokens. Tap 🎲 Roll on your turn.", "You need a 6 to bring a token out of home. A 6 gives you another roll.", "Land on an opponent's token (not on a ⭐ safe square) to send it back home — and roll again!", "Go around the board and reach your home column. You need the exact number to enter the final square.", "First player to bring all 4 tokens home wins. Three 6s in a row = turn lost."],
    hi: ["Har player ke paas 4 goti (tokens) hoti hain. Apni baari par 🎲 Roll dabao.", "Goti ko ghar se bahar nikalne ke liye 6 aana zaroori hai. 6 aane par dobara dice milta hai.", "Agar aap rival ki goti par pahunch jaate ho (⭐ safe square ke alawa) to woh wapas ghar chali jaati hai — aur aapko extra turn milta hai!", "Poora board ghoom kar apne home column tak pahuncho. Aakhri square ke liye exact number chahiye.", "Jo pehle apni saari 4 goti ghar pahuncha de woh jeetega. Lagatar teen 6 aaye to baari chali jaati hai."]
  },
  snakeladder: {
    en: ["Both players start off the board. On your turn press 🎲 Roll dice and your token moves that many squares (1 → 100, zig-zag).", "Land on the bottom of a ladder 🪜 and you climb up. Land on a snake's head 🐍 and you slide down to its tail.", "Roll a 6 and you roll again — but three 6s in a row and you lose your turn.", "Reach square 100 first to win. On Medium and Hard you need the EXACT number to land on 100; on Easy any roll that reaches 100 wins.", "Pick Easy / Medium / Hard in the room: more snakes and fewer ladders as the level goes up."],
    hi: ["Dono players board ke bahar se shuru karte hain. Apni baari par 🎲 Roll dice dabao — goti utne square aage badhti hai (1 se 100, zig-zag).", "Ladder 🪜 ke neeche pahunche to upar chadh jaoge. Saanp 🐍 ke munh par pahunche to uski poonch tak phisal jaoge.", "6 aaya to dobara dice milta hai — lekin lagatar teen 6 aaye to baari chali jaati hai.", "Jo pehle 100 square par pahunche woh jeetega. Medium aur Hard mein 100 par pahunchne ke liye exact number chahiye; Easy mein 100 tak pahunchne wala koi bhi roll chalega.", "Room mein Easy / Medium / Hard chuno: level badhne par saanp zyada aur ladder kam hoti hain."]
  },
  chess: {
    en: ["Classic chess: White (Player 1) moves first.", "Tap a piece to see its legal moves (dots), then tap the destination.", "Checkmate the opposing king to win. Stalemate or draw rules = draw.", "Pawns promote to a queen automatically."],
    hi: ["Classic chess: White (Player 1) pehle chalta hai.", "Piece par tap karo — uski legal moves dots mein dikhengi, phir jahan jaana ho wahan tap karo.", "Rival ke king ko checkmate karo to aap jeet jaate ho. Stalemate ya draw rule par game draw hota hai.", "Pawn aakhri line par pahunch kar apne aap Queen ban jaata hai."]
  },
  checkers: {
    en: ["Move your pieces diagonally forward onto empty dark squares.", "Jump over an enemy piece to capture it — captures are compulsory, and you can chain jumps.", "Reach the far side to become a king ♛ (moves both directions).", "Capture all enemy pieces or block them to win."],
    hi: ["Apni goti ko tirchi (diagonal) aage ki taraf khali dark square par chalao.", "Rival ki goti ke upar se kood kar use capture karo — capture karna zaroori hai, aur lagatar kood bhi sakte ho.", "Doosri taraf pahunchte hi goti King ♛ ban jaati hai (aage-peeche dono taraf chalti hai).", "Rival ki saari goti khatam karo ya unhe phasa do — aap jeet gaye."]
  },
  connect4: {
    en: ["Take turns dropping a disc into one of the 7 columns.", "Discs fall to the lowest empty slot.", "Connect 4 of your discs in a line (across, down or diagonal) to win.", "Board full with no line = draw."],
    hi: ["Baari-baari se 7 columns mein se kisi ek mein disc girao.", "Disc sabse neeche wali khali jagah par girti hai.", "Apni 4 disc ek line mein (aadi, seedhi ya tirchi) jodo to aap jeet jaate ho.", "Board bhar jaaye aur line na bane to draw."]
  },
  dotsboxes: {
    en: ["Take turns drawing one line between two dots.", "Close the 4th side of a box to claim it — then play again!", "The board has 25 boxes, so there is always a winner.", "Most boxes wins."],
    hi: ["Baari-baari se do dots ke beech ek line kheencho.", "Jab kisi box ki 4th side poori karo to woh box aapka — aur dobara baari milti hai!", "Board mein 25 boxes hain, isliye draw nahi hota.", "Jiske zyada boxes, woh jeetega."]
  },
  battleship: {
    en: ["Place your fleet of 3 ships (4, 3 and 2 cells) on the grid. Use Rotate, 🎲 Random or Reset, then press ✔ Ready.", "Take turns firing at a square in ENEMY WATERS. ✕ = hit, dot = miss.", "A hit gives you another shot!", "Sink all enemy ships first to win."],
    hi: ["Apne 3 jahaz (4, 3 aur 2 cell ke) grid par lagao. Rotate, 🎲 Random ya Reset use karo, phir ✔ Ready dabao.", "Baari-baari se ENEMY WATERS ke kisi square par fire karo. ✕ = hit, dot = miss.", "Hit lagne par aapko ek aur shot milta hai!", "Jo pehle rival ke saare jahaz dooba de woh jeetega."]
  },
  dominoes: {
    en: ["Each player gets 7 tiles. The first player can play any tile.", "Match one end of the chain with the same number of dots. If a tile fits both ends, choose Left or Right.", "No playable tile? Draw from the boneyard until you can play. If it is empty, Pass.", "Empty your hand first to win. If the game is blocked, the lowest dot total wins."],
    hi: ["Har player ko 7 tiles milti hain. Pehla player koi bhi tile rakh sakta hai.", "Chain ke kisi ek end par same dots wali tile lagao. Agar tile dono ends par fit ho to Left ya Right chuno.", "Koi tile nahi chal sakti? Boneyard se tile uthao jab tak chal na sake. Boneyard khali ho to Pass karo.", "Jo pehle apni saari tiles khatam kare woh jeetega. Game block ho jaaye to kam dots wala jeetega."]
  },
  mancala: {
    en: ["Each side has 6 pits (4 stones each) and a store on the right.", "Pick one of your pits. Its stones are sown one-by-one counter-clockwise, including your own store (not the rival's).", "Last stone in your store = play again. Last stone in an empty pit of yours = capture the stones opposite!", "When one side is empty, the game ends. Most stones in the store wins."],
    hi: ["Har taraf 6 pits hain (har mein 4 stones) aur daayin taraf aapka store hai.", "Apna koi ek pit chuno. Uske stones ek-ek karke ulti ghadi ki disha mein bante jaate hain, aapke store mein bhi (rival ke store mein nahi).", "Aakhri stone aapke store mein gira to dobara baari! Aakhri stone aapke khali pit mein gira to saamne wale pit ke saare stones capture ho jaate hain!", "Ek taraf ke pits khali hote hi game khatam. Store mein zyada stones wala jeetega."]
  },
  reversi: {
    en: ["Place a disc on a glowing square so that it traps one or more rival discs in a straight line.", "Trapped discs flip to your colour.", "If you have no legal move, your turn is skipped.", "When the board is full (or nobody can move) the player with the most discs wins."],
    hi: ["Chamakte hue square par disc rakho taaki rival ki ek ya zyada disc seedhi line mein phans jaayein.", "Phansi hui discs aapke rang ki ho jaati hain.", "Agar koi legal move na ho to aapki baari skip ho jaati hai.", "Board bhar jaaye (ya koi na chal sake) to jiski zyada discs woh jeetega."]
  },
  gomoku: {
    en: ["Take turns placing a stone on the 11×11 board.", "Be the first to make 5 stones in a row — across, down or diagonal.", "Board full with no five = draw."],
    hi: ["Baari-baari se 11×11 board par stone rakho.", "Jo pehle 5 stones ek line mein (aadi, seedhi ya tirchi) bana le woh jeetega.", "Board bhar jaaye aur 5 na bane to draw."]
  },
  snake: {
    en: ["Both snakes move automatically on the same board. Steer with the Arrow keys / WASD, the on-screen D-pad, or by swiping.", "Eat 🍎 apples to grow. First to eat 10 apples wins.", "Hit a wall, yourself or the other snake and you lose. Head-on crash = draw.", "You can't reverse straight into yourself."],
    hi: ["Dono saanp ek hi board par apne aap chalte hain. Arrow keys / WASD, screen ke D-pad ya swipe se disha badlo.", "🍎 apple khao aur lambe ho jao. Jo pehle 10 apple kha le woh jeetega.", "Deewar, khud ko ya doosre saanp ko takraye to aap haar jaate ho. Aamne-saamne takkar = draw.", "Seedha ulta nahi mud sakte."]
  },
  pong: {
    en: ["Move your paddle up and down — drag with your finger/mouse or use ↑ ↓ (W/S).", "Bounce the ball back. If it passes your paddle, your rival scores.", "Hit near the paddle's edge for a sharper angle. The ball speeds up!", "First to 5 goals wins."],
    hi: ["Apna paddle upar-neeche chalao — ungli/mouse se drag karo ya ↑ ↓ (W/S) use karo.", "Ball ko wapas maaro. Ball aapke paddle se nikal gayi to rival ko point milta hai.", "Paddle ke kinare se maaroge to ball tej angle par jaayegi. Ball dheere-dheere tez hoti hai!", "Jo pehle 5 goal kare woh jeetega."]
  },
  brickbreaker: {
    en: ["Both players play their OWN brick wall at the same time (60 seconds, 3 lives). Move the paddle with mouse/finger or ← →.", "Break bricks with the ball — top rows are worth more points.", "Don't let the ball fall! Clear the wall and a new one appears.", "Highest score when both finish wins."],
    hi: ["Dono players ek saath apni-apni brick wall par khelte hain (60 second, 3 lives). Paddle ko mouse/ungli ya ← → se chalao.", "Ball se bricks todo — upar ki rows ke zyada points milte hain.", "Ball ko girne mat do! Poori wall tod do to nayi wall aa jaati hai.", "Dono ke khatam hone par jiska score zyada woh jeetega."]
  },
  spaceshooter: {
    en: ["Both pilots fly the same wave of enemies at the same time (45 seconds, 3 lives).", "Your ship fires automatically. Move it with your finger/mouse or ← →.", "Shoot 👾 aliens (+10 each). If an alien hits you, you lose a life.", "Highest score wins."],
    hi: ["Dono pilots ek saath same dushmanon se ladte hain (45 second, 3 lives).", "Aapka jahaz apne aap goli chalata hai. Use ungli/mouse ya ← → se hilao.", "👾 aliens ko maaro (har ek ke +10). Alien takraya to ek life jaati hai.", "Jiska score zyada woh jeetega."]
  },
  tanks: {
    en: ["Turn-based artillery. On your turn set the ANGLE and POWER, then press 🔥 Fire.", "The 💨 wind pushes your shell — it changes every turn. The hill in the middle blocks low shots.", "A direct hit does 45 damage, a near miss 25. Each tank has 100 HP.", "Destroy the enemy tank to win."],
    hi: ["Turn-based top ka khel. Apni baari par ANGLE aur POWER set karo, phir 🔥 Fire dabao.", "💨 hawa goley ko dhakka deti hai — har baari badalti hai. Beech ki pahadi neeche ke shots ko rok leti hai.", "Seedha hit = 45 damage, paas girna = 25. Har tank ke 100 HP hain.", "Rival ka tank udao aur jeet jao."]
  },
  platformrace: {
    en: ["Both players run on their own track at the same time (35 seconds).", "Tap / click / press Space or ↑ to JUMP over the obstacles. The speed keeps increasing.", "Crash and your run ends — your distance is your score.", "The longest distance wins."],
    hi: ["Dono players ek saath apne-apne track par daudte hain (35 second).", "Rukawat se bachne ke liye tap / click / Space ya ↑ dabao aur JUMP karo. Speed badhti rehti hai.", "Takra gaye to run khatam — jitni door gaye wahi aapka score.", "Jo sabse zyada door jaaye woh jeetega."]
  },
  carracing: {
    en: ["Race down a 3-lane road at the same time as your rival (40 seconds).", "Tap the left / right half of the screen, or use ← → / A D, to change lanes.", "Dodge the traffic — a crash ends your race. Speed keeps rising.", "The longest distance wins."],
    hi: ["3 lane ki sadak par apne rival ke saath ek saath race lagao (40 second).", "Lane badalne ke liye screen ke left / right hisse par tap karo ya ← → / A D dabao.", "Traffic se bacho — takkar hui to race khatam. Speed badhti rehti hai.", "Jo sabse zyada door jaaye woh jeetega."]
  },
  bikeracing: {
    en: ["Ride a fast bike down a 4-lane road at the same time as your rival (40 seconds).", "Tap the left / right half of the screen, or use ← → / A D, to change lanes.", "Dodge the traffic — a crash ends your ride. Bikes are faster than cars!", "The longest distance wins."],
    hi: ["4 lane ki sadak par tez bike chalao, rival bhi saath mein (40 second).", "Lane badalne ke liye screen ke left / right hisse par tap karo ya ← → / A D dabao.", "Traffic se bacho — takkar hui to ride khatam. Bike car se zyada tez hai!", "Jo sabse zyada door jaaye woh jeetega."]
  },
  penalty: {
    en: ["Penalty shoot-out: 5 kicks each, taking turns. Both players choose at the same time.", "The KICKER picks a corner: Left, Centre or Right. The KEEPER picks where to dive.", "Different choices = ⚽ GOAL. Same choice = 🧤 SAVE.", "Most goals after 5 kicks wins. A tie goes to sudden death."],
    hi: ["Penalty shoot-out: har player ki 5 kicks, baari-baari se. Dono ek saath choice karte hain.", "KICKER ek corner chunta hai: Left, Centre ya Right. KEEPER chunta hai kis taraf kudna hai.", "Alag choice = ⚽ GOAL. Same choice = 🧤 SAVE.", "5 kicks ke baad zyada goal wala jeetega. Barabar hone par sudden death."]
  },
  basketball: {
    en: ["Free-throw duel: 5 shots each, taking turns.", "A marker slides across the power bar. Tap SHOOT when it is in the green zone for a sure basket!", "Near the green (yellow zone) you might still score. Far away = miss.", "Most baskets wins. A tie goes to sudden death."],
    hi: ["Free-throw muqabla: har player ke 5 shots, baari-baari se.", "Power bar par ek marker idhar-udhar jaata hai. Jab woh green zone mein ho tab SHOOT dabao — pakka basket!", "Green ke paas (yellow zone) mein bhi basket lag sakta hai. Door = miss.", "Zyada baskets wala jeetega. Barabar hone par sudden death."]
  },
  airhockey: {
    en: ["Move your mallet with your finger/mouse on YOUR half (bottom of your screen).", "Hit the puck into your rival's goal. Walls bounce the puck.", "First to 5 goals wins."],
    hi: ["Apne mallet ko ungli/mouse se APNE hisse (screen ke neeche) mein chalao.", "Puck ko rival ke goal mein daalo. Deewar se puck uchhalti hai.", "Jo pehle 5 goal kare woh jeetega."]
  },
  minigolf: {
    en: ["Both players play the same 3 holes at the same time. Drag back from the ball and release to putt (longer drag = more power).", "Get the ball in the hole in as few strokes as possible. Max 8 strokes per hole.", "Fewest total strokes wins."],
    hi: ["Dono players ek saath wahi 3 holes khelte hain. Ball se peeche ki taraf drag karo aur chhod do (jitna lamba drag utni zyada power).", "Ball ko kam se kam shots mein hole mein daalo. Har hole par maximum 8 shots.", "Sabse kam total shots wala jeetega."]
  },
  memory: {
    en: ["16 cards hide 8 pairs of emojis. Flip two cards on your turn.", "Match = you score a pair and play again. No match = the cards flip back and it is your rival's turn.", "Most pairs wins."],
    hi: ["16 cards mein 8 jodi emoji chhupe hain. Apni baari par do cards ulto.", "Match hua to aapko ek jodi mili aur dobara baari. Match nahi hua to cards wapas ulte aur rival ki baari.", "Zyada jodi wala jeetega."]
  },
  wordscramble: {
    en: ["Both players see the same scrambled word and a hint category.", "Type the correct word and press Go — first correct answer scores.", "A wrong answer locks you out of that word.", "First to 3 words wins."],
    hi: ["Dono players ko same ulta-pulta shabd aur ek hint category dikhti hai.", "Sahi shabd type karo aur Go dabao — pehle sahi jawab par point milta hai.", "Galat jawab diya to us shabd ke liye aap lock ho jaate ho.", "Jo pehle 3 shabd sahi kare woh jeetega."]
  },
  quiz: {
    en: ["Same question, 4 options, for both players at the same time.", "First correct tap scores a point. A wrong tap locks you out of that question.", "Questions come from general knowledge, India and science.", "First to 3 correct answers wins."],
    hi: ["Dono players ko ek saath same sawal aur 4 options milte hain.", "Pehle sahi option par tap karne wale ko point milta hai. Galat tap par us sawal ke liye lock.", "Sawal general knowledge, India aur science se aate hain.", "Jo pehle 3 sahi jawab de woh jeetega."]
  },
  mathrace: {
    en: ["Both players get the same maths question.", "Type the answer and press Go — first correct answer scores.", "A wrong answer locks you out of that question.", "First to 3 correct answers wins."],
    hi: ["Dono players ko same maths ka sawal milta hai.", "Jawab type karo aur Go dabao — pehle sahi jawab par point milta hai.", "Galat jawab par us sawal ke liye lock ho jaoge.", "Jo pehle 3 sahi jawab de woh jeetega."]
  },
  codebreaker: {
    en: ["The computer hides a secret code of 4 colours (colours can repeat).", "Take turns guessing. ⚫ = right colour in the right place, ⚪ = right colour in the wrong place.", "The first player to crack the code wins. You share 12 guesses in total."],
    hi: ["Computer 4 rangon ka ek secret code chhupata hai (rang repeat ho sakte hain).", "Baari-baari se guess karo. ⚫ = sahi rang sahi jagah, ⚪ = sahi rang galat jagah.", "Jo pehle code todega woh jeetega. Dono ke milakar kul 12 guess milte hain."]
  },
  sequence: {
    en: ["Watch the colour pattern flash, then repeat it by tapping the colours in the same order.", "After repeating it perfectly, add ONE new colour to the end. Then it is your rival's turn.", "Make a mistake and you lose. The pattern gets longer every turn!"],
    hi: ["Rangon ka pattern chamakta dekho, phir wahi rang usi order mein tap karke dohrao.", "Bilkul sahi dohrane ke baad pattern ke end mein EK naya rang jodo. Phir rival ki baari.", "Galti ki to aap haar gaye. Har baari pattern lamba hota jaata hai!"]
  },
  colorduel: {
    en: ["A pattern of colours is shown for a few seconds — memorise it!", "When GO appears, tap the colours in the same order. Both players race at the same time.", "First correct pattern scores. A wrong pattern locks you out of that round.", "First to 3 wins."],
    hi: ["Kuch second ke liye rangon ka pattern dikhaya jaata hai — yaad kar lo!", "GO aate hi wahi rang usi order mein tap karo. Dono players ek saath daudte hain.", "Pehle sahi pattern par point. Galat pattern par us round ke liye lock.", "Jo pehle 3 point le woh jeetega."]
  },
  hangman: {
    en: ["Guess the hidden word one letter at a time. A category hint is shown.", "Players take turns. A correct letter lets you guess again.", "A wrong letter draws part of the hangman. 6 mistakes = nobody wins.", "Complete the word to win."],
    hi: ["Chhupe hue shabd ko ek-ek akshar se guess karo. Category ka hint dikhta hai.", "Baari-baari se khelo. Sahi akshar par dobara guess milta hai.", "Galat akshar par hangman ka ek hissa banta hai. 6 galtiyan = koi nahi jeetega.", "Jo shabd poora kare woh jeetega."]
  },
  higherlower: {
    en: ["A secret number between 1 and 100 is chosen.", "Take turns guessing. You are told if the secret is higher or lower, and the range shrinks.", "Whoever guesses the exact number wins."],
    hi: ["1 se 100 ke beech ek secret number chuna jaata hai.", "Baari-baari se guess karo. Batata hai ki secret number bada hai ya chhota, aur range kam hoti jaati hai.", "Jo bilkul sahi number guess kare woh jeetega."]
  },
  numberduel: {
    en: ["Secretly pick a number from 1 to 10. Both numbers are revealed together.", "The HIGHER number wins. Same number = draw."],
    hi: ["Chupke se 1 se 10 ke beech ek number chuno. Dono number ek saath khulte hain.", "BADA number jeetta hai. Same number = draw."]
  },
  maze: {
    en: ["Both players start in the top-left corner of the same maze.", "Move with the Arrow keys / WASD or the on-screen D-pad. Walls block you.", "First to reach the ⭐ in the bottom-right corner wins."],
    hi: ["Dono players same maze ke upar-left kone se shuru karte hain.", "Arrow keys / WASD ya screen ke D-pad se chalo. Deewar se nahi ja sakte.", "Jo pehle neeche-right kone ke ⭐ tak pahunche woh jeetega."]
  },
  whack: {
    en: ["Moles pop up in a 3×3 grid of holes — 20 moles in total.", "Tap the mole before your rival does! Only the first tap scores.", "Tapping an empty hole gives a short 0.7-second penalty.", "Most whacks wins."],
    hi: ["3×3 holes mein se moles bahar aate hain — kul 20 moles.", "Rival se pehle mole par tap karo! Sirf pehle tap par point milta hai.", "Khali hole par tap kiya to 0.7 second ki saza milti hai.", "Zyada moles marne wala jeetega."]
  },
  rps: {
    en: ["Both players secretly choose ✊ Rock, ✋ Paper or ✌️ Scissors.", "Rock beats Scissors, Scissors beats Paper, Paper beats Rock.", "Choices are revealed together. Same choice = draw."],
    hi: ["Dono players chupke se ✊ Rock, ✋ Paper ya ✌️ Scissors chunte hain.", "Rock Scissors ko, Scissors Paper ko aur Paper Rock ko haraata hai.", "Dono ki choice ek saath khulti hai. Same choice = draw."]
  },
  drawguess: {
    en: ["One player is the DRAWER and sees a secret word. The other is the GUESSER.", "The drawer sketches it (finished strokes appear for the guesser). No letters or numbers!", "The guesser types guesses. Guess the word within 90 seconds to win.", "Press ▶ Play again to swap roles."],
    hi: ["Ek player DRAWER hai jise secret shabd dikhta hai. Doosra GUESSER hai.", "Drawer chitra banata hai (poori hui lines guesser ko dikhti hain). Akshar ya number likhna mana hai!", "Guesser guess type karta hai. 90 second mein shabd pehchan liya to woh jeetega.", "Roles badalne ke liye ▶ Play again dabao."]
  },
  reaction: {
    en: ["The screen is RED — wait…", "The moment it turns GREEN, tap as fast as you can!", "Tap too early and you lose. The fastest tap wins."],
    hi: ["Screen LAAL hai — intezaar karo…", "Jaise hi GREEN ho, jitna tez ho sake tap karo!", "Jaldi tap kiya to aap haar gaye. Sabse tez tap jeetta hai."]
  },
  pig: {
    en: ["On your turn, 🎲 Roll as many times as you like and add the dice to your turn total.", "Roll a 1 and you lose the turn total and your turn ends!", "Press ✋ Hold to bank your turn total into your score.", "First to the target wins (30 on Easy, 50 on Medium, 100 on Hard)."],
    hi: ["Apni baari par jitni baar chaho 🎲 Roll karo — dice ka number turn total mein judta hai.", "Agar 1 aaya to turn total ud jaata hai aur baari khatam!", "✋ Hold dabao to turn total aapke score mein jama ho jaata hai.", "Jo pehle target points banaye woh jeetega (Easy 30, Medium 50, Hard 100)."]
  }
};
