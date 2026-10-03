from pathlib import Path
import re, hashlib, json, shutil
root=Path.cwd(); out=root/'reports/Holistic-Mind-LaTeX'
s=(root/'reports/working/report-detailed.md').read_text()
s=s.replace('Rek et al., 2024','Slade et al., 2024')
s=s.replace('Rek et al. (2024)','Slade et al. (2024)').replace('Rek, B. et al. (2024)', 'Slade, E., Rennick-Egglestone, S., Ng, F., Kotera, Y., Llewellyn-Beardsley, J., Newby, C., Glover, T., Keppens, J. and Slade, M. (2024)')
s=s.replace('Chapter 2 reviews relevant technical ideas;', 'Section 2 reviews relevant technical ideas;').replace('Chapter 3 defines objectives and scope;', 'Section 3 defines objectives and scope;').replace('Chapters 4 to 6 explain methodology, design, and implementation;', 'Sections 4 to 6 explain methodology, design, and implementation;').replace('Chapter 7 examines testing evidence;', 'Section 7 examines testing evidence;').replace('Chapter 8 evaluates', 'Section 8 evaluates')
s=s.replace('Chapters ', 'Sections ').replace('Chapter ', 'Section ')
s=s.replace('@figure|ranking|Figure 6. Recommendation stages and implemented base-score weights. Hard exclusions precede all scoring; journals do not supply H in current application requests.|6.5','@figure|recommendation-five-stages|The five-stage recommendation engine and feedback loop. Eligibility is enforced before any scoring; journal text and embeddings are excluded from current application requests.|6.5')
s=s.replace('Sections 5–8; Figures 13–15','Sections 5–8; historical Home/Explore and Profile/History figures')
s=s.replace('## 8.4 Answers to research questions','''## 8.4 Comparison with the reviewed knowledge base

The artefact applies the combination principle described by Burke (2002) through an eligibility gate and a conditional weighted ranker. Its contribution lies in the integration of those mechanisms with a daily mobile workflow, rather than a new general-purpose recommendation algorithm. It uses the pretrained semantic representation described by Reimers and Gurevych (2019), without claiming domain-specific model training. The saved comparison shows a 4.17 percentage-point Precision@4 improvement over rules, but that improvement accompanies a higher negative-label selection rate and does not establish a better experience for users.

The NarraGive work described by Slade et al. (2024) motivates attention to several evaluation dimensions rather than a single accuracy score. Holistic Mind reports relevance, ordering, violations, coverage, diversity, and timing. However, its authored, interaction-free fixtures provide a narrower evidence base than an evaluation of actual narrative use. The project's collaborative component exists in implementation but remains untested by the saved cold-start benchmark. Independent access through Explore provides a useful design route outside personalised ranking, although its effect on feedback bias has not been measured.

The mixed evidence reviewed by Matthews and Rhodes-Maquire (2025) also limits interpretation: personalisation does not automatically imply additional mental-health benefit. Holistic Mind demonstrates implemented selection support and a privacy boundary, not a proven therapeutic intervention. Relative to a recommender-platform approach such as Tapuria et al. (2024), it concentrates on selection within a managed exercise catalogue and connects that selection to practice feedback and encrypted reflection. These comparisons identify the artefact's scope and unresolved questions without claiming superiority over systems evaluated on different tasks.

## 8.5 Answers to research questions''')
# Renumber subsequent subsections after the comparison insertion.
for old,new in [(9,10),(8,9),(7,8),(6,7)]:
 s=s.replace(f'## 8.{old} ',f'## 8.{new} ')
s=s.replace('## 8.5 Future research and privacy work','## 8.6 Future research and privacy work')
# Protect raw authored LaTeX expansion as a single block.
exp=(root/'reports/working/recommender-expansion.tex').read_text().replace('\\subsubsection{The five-stage recommendation engine}','\\subsubsection{Pipeline overview and service integration}')
s=s.replace('## 6.3 Recommendation service integration','## 6.3 Five-stage hybrid recommendation engine')
s=s.replace('## 6.4 Encrypted journaling', '@latex-expansion\n\n## 6.4 Encrypted journaling')
# Figure numbering from the old source is resolved with semantic labels.
oldfig={1:'welcome',2:'timeline',3:'architecture',4:'journey',5:'data',6:'recommendation-five-stages',7:'sequence',8:'library',9:'privacy',10:'content',11:'home_explore',12:'history_profile',13:'evolution',14:'productionchart',15:'comfortchart'}
s=re.sub(r'## 6\.8 Detailed ranking calculations and selection.*?(?=## 6\.9)', '', s, flags=re.S)
source=s
# Normalise Unicode for pdfLaTeX portability.
trans={'–':'--','—':'---','’':"'",'‘':"'",'“':'``','”':"''",'−':'-','…':'...','×':r'\ensuremath{\times}','≥':r'\ensuremath{\geq}','≤':r'\ensuremath{\leq}'}
refs=[
 ('burke2002','Burke(2002)','Burke, R. (2002)'),('fullel2026','Fullel(2026)','Fullel, S. (2026)'),('hevner2004','Hevner et al.(2004)','Hevner, A. R.'),
 ('project2026a','Holistic Mind project(2026a)','Holistic Mind project (2026a)'),('project2026b','Holistic Mind project(2026b)','Holistic Mind project (2026b)'),('project2026c','Holistic Mind project(2026c)','Holistic Mind project (2026c)'),('project2026d','Holistic Mind project(2026d)','Holistic Mind project (2026d)'),
 ('linardon2019','Linardon et al.(2019)','Linardon, J.'),('matthews2025','Matthews and Rhodes-Maquire(2025)','Matthews, P.'),('morris2023','Morris et al.(2023)','Morris, J. X.'),('rai2026','Rai(2026)','Rai, A.'),('reimers2019','Reimers and Gurevych(2019)','Reimers, N.'),('slade2024','Slade et al.(2024)','Slade, E.'),('samhsa','SAMHSA(n.d.)','SAMHSA (n.d.)'),('minilm','Sentence Transformers(n.d.)','Sentence Transformers (n.d.)'),
 ('shrestha2026a','Shrestha(2026a)','Shrestha, S. (2026a)'),('shrestha2026b','Shrestha(2026b)','Shrestha, S. (2026b)'),('shrestha2026c','Shrestha(2026c)','Shrestha, S. (2026c)'),('shrestha2026d','Shrestha(2026d)','Shrestha, S. (2026d)'),('shresthand','Shrestha(n.d.)','Shrestha, S. (n.d.)'),('tapuria2024','Tapuria et al.(2024)','Tapuria, A.')]
cites={'Burke (2002)':'burke2002','Burke\'s (2002)':'burke2002','Hevner et al. (2004)':'hevner2004','Linardon et al. (2019)':'linardon2019','Matthews and Rhodes-Maquire (2025)':'matthews2025','Morris et al. (2023)':'morris2023','Reimers and Gurevych (2019)':'reimers2019','Slade et al. (2024)':'slade2024','Tapuria et al. (2024)':'tapuria2024'}
paren={'Slade et al., 2024':'slade2024','Shrestha, 2026a':'shrestha2026a','Shrestha, 2026b':'shrestha2026b','Shrestha, 2026c':'shrestha2026c','Shrestha, 2026d':'shrestha2026d','Rai, 2026':'rai2026','Fullel, 2026':'fullel2026','Sentence Transformers, n.d.':'minilm','SAMHSA, n.d.':'samhsa'}
def escaped(t):
 for a,b in trans.items(): t=t.replace(a,b)
 # Replacement placeholder protects generated commands from subsequent escaping.
 marks=[]
 def hold(v): marks.append(v); return f'ZZLATEX{len(marks)-1}ZZ'
 t=re.sub(r'https?://[^\s]+',lambda m:hold(r'\url{'+m.group().rstrip('.')+'}'+('.' if m.group().endswith('.') else '')),t)
 t=re.sub(r'(?<![A-Za-z0-9_.])(?:samyam docs|backend|src|admin|recommender|data)/[A-Za-z0-9_./-]*[A-Za-z0-9_/-]',lambda m:hold(r'\path{'+m.group()+'}'),t)
 t=re.sub(r'evaluation_results_[a-z_]+\.json',lambda m:hold(r'\path{'+m.group()+'}'),t)
 for phrase,key in cites.items():
  t=t.replace(phrase,hold(r'\citet{'+key+'}'))
 def pc(m):
  content=m.group(1)
  parts=[p.strip() for p in content.split(';')]
  if parts and all(p in paren for p in parts): return hold(r'\citep{'+','.join(paren[p] for p in parts)+'}')
  # Handle same-author shorthand in old milestone citation.
  if content=='Shrestha, 2026b; 2026c; 2026d': return hold(r'\citep{shrestha2026b,shrestha2026c,shrestha2026d}')
  return m.group()
 t=re.sub(r'\(([^()]*)\)',pc,t)
 # Named figure references: plural pairs/ranges first.
 def plural(m):
  nums=list(map(int,re.findall(r'\d+',m.group())))
  keys=[oldfig[n] for n in nums]
  return hold('Figures~'+(' and '.join(r'\ref{fig:'+k+'}' for k in keys)))
 t=re.sub(r'Figures (\d+) (?:and|--|–) (\d+)',plural,t)
 t=re.sub(r'Figures (\d+)--(\d+)',plural,t)
 t=re.sub(r'Figure (\d+)',lambda m:hold(r'Figure~\ref{fig:'+oldfig[int(m.group(1))]+'}'),t)
 t=re.sub(r'Table (\d+)',lambda m:hold(r'Table~\ref{tab:table-'+m.group(1)+'}'),t)
 chars={'\\':r'\textbackslash{}','&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}','~':r'\textasciitilde{}','^':r'\textasciicircum{}'}
 t=''.join(chars.get(c,c) for c in t)
 t=t.replace('/', r'/\allowbreak{}')
 for i,m in enumerate(marks): t=t.replace(f'ZZLATEX{i}ZZ',m)
 return t
figorder=[];tables=[]
figtitles={'welcome':'Welcome screen','timeline':'Development sequence','architecture':'Logical service architecture','journey':'Daily user journey','data':'Conceptual data relationships','recommendation-five-stages':'Five-stage recommendation engine and feedback loop','sequence':'Recommendation API sequence','library':'Library screen','recommendation-weights':'Cold-start and collaboration-active score weights','privacy':'Journal encryption and recovery boundary','content':'Content publication workflow','home_explore':'Historical Home and Explore interfaces','history_profile':'Historical Profile and History interfaces','evolution':'Evolution of the implemented design','productionchart':'Journal-free ONNX benchmark results','comfortchart':'Explicit-comfort ONNX benchmark results'}
def figure(b):
 _,key,cap,width=b.split('|');cap=re.sub(r'^Figure \d+\. ','',cap)
 ext='pdf' if key.startswith('recommendation-') else 'png';figorder.append(key)
 maxheight='0.70' if key=='recommendation-five-stages' else '0.62'
 return '\n'.join([r'\begin{figure}[htbp]',r'\centering',r'\includegraphics[width=\linewidth,height='+maxheight+r'\textheight,keepaspectratio]{figures/'+key+'.'+ext+'}',r'\caption['+figtitles[key]+']{'+escaped(cap)+'}',r'\label{fig:'+key+'}',r'\end{figure}',r'\FloatBarrier'])
def table(b):
 lines=b.splitlines(); cap=lines[0].split('|',1)[1];num=int(re.search(r'Table (\d+)',cap).group(1));cap=re.sub(r'^Table \d+\. ','',cap); rows=[line.split('|') for line in lines[1:] if line!='@end'];cols=len(rows[0]); assert all(len(x)==cols for x in rows)
 widths={1:[.20,.30,.26,.24],2:[.25,.29,.18,.28],3:[.34,.20,.20,.26],4:[.22,.26,.26,.26],5:[.24,.29,.24,.23]}.get(num,[1/cols]*cols)
 spec='@{}'+' '.join('>{\\raggedright\\arraybackslash}p{'+f'{w:.3f}'+r'\TableInnerWidth}' for w in widths)+'@{}'
 header=' & '.join(r'\textbf{'+escaped(v)+'}' for v in rows[0])+r' \\'
 body='\n'.join(' & '.join(escaped(v) for v in row)+r' \\ \addlinespace[4pt]' for row in rows[1:])
 tables.append(num)
 return '\n'.join([r'\begingroup',r'\small\setstretch{1.08}',r'\setlength{\tabcolsep}{4pt}',r'\setlength{\TableInnerWidth}{\dimexpr\linewidth-'+str((cols-1)*8)+r'pt\relax}',r'\begin{longtable}{'+spec+'}',r'\caption{'+escaped(cap)+r'}\label{tab:table-'+str(num)+r'}\\',r'\toprule',header,r'\midrule\endfirsthead',r'\multicolumn{'+str(cols)+r'}{l}{\textit{Table \thetable\ continued}}\\',r'\toprule',header,r'\midrule\endhead',r'\midrule\multicolumn{'+str(cols)+r'}{r}{\textit{Continued on next page}}\\\endfoot',r'\bottomrule\endlastfoot',body,r'\end{longtable}',r'\endgroup'])
# Split by top-level headings.
parts=re.split(r'^# (.+)$',s,flags=re.M)
inputs=[]; refcontent='';names=[]
for i in range(1,len(parts),2):
 title,content=parts[i],parts[i+1]
 if title=='References':
  blocks=[b.strip() for b in content.split('\n\n') if b.strip()]
  entries=[]
  for b in blocks:
   key,label=next((k,l) for k,l,prefix in refs if b.startswith(prefix))
   entries.append((b.split(' (')[0],r'\bibitem['+label+']{'+key+'}\n'+escaped(b)))
  entries.sort()
  # Final-date records supporting current refinement and the new source walkthrough.
  entries.insert(2,('Holistic Mind project (2026e)',r'\bibitem[Holistic Mind project(2026e)]{project2026e}'+'\n'+escaped('Holistic Mind project (2026e) Recent changes and current recommendation implementation. samyam docs/RECENT-CHANGES.md; backend/src/routes/recommendations.ts; recommender/app/engine.py; src/screens/home/HomeScreen.tsx. Source inspected 3 October 2026. See Appendix D and the packaged evidence manifest.')))
  refcontent=r'\phantomsection\addcontentsline{toc}{section}{References}'+'\n'+r'\begin{thebibliography}{99}'+'\n'+'\n\n'.join(v for _,v in sorted(entries))+'\n'+r'\end{thebibliography}'+'\n';(out/'references.tex').write_text(refcontent);continue
 if title=='Abstract': filename='00-abstract.tex';opening=r'\section*{Abstract}\addcontentsline{toc}{section}{Abstract}'
 elif title.startswith('Appendix'):
  letter=re.search(r'Appendix ([A-Z])',title).group(1);clean=title.split('. ',1)[1];filename='appendix-'+letter.lower()+'.tex';opening=r'\section{'+escaped(clean)+'}'
 else:
  num=int(title.split('.')[0]); clean=title.split('. ',1)[1];filename=f'{num:02d}-'+re.sub(r'[^a-z0-9]+','-',clean.lower()).strip('-')+'.tex';opening=r'\section{'+escaped(clean)+'}\label{sec:chapter-'+str(num)+'}'
 chunks=[opening]
 for b in [x.strip() for x in content.split('\n\n') if x.strip()]:
  if b=='@latex-expansion':
   for eb in exp.split('\n\n'):
    chunks.append(figure(eb.strip()) if eb.startswith('@figure|') else eb)
  elif b.startswith('@figure|'): chunks.append(figure(b))
  elif b.startswith('@table|'): chunks.append(table(b))
  elif b.startswith('## '): chunks.append(r'\subsection{'+escaped(re.sub(r'^\d+\.\d+\s+','',b[3:]))+'}')
  else: chunks.append(escaped(b))
 (out/'chapters'/filename).write_text('\n\n'.join(chunks)+'\n');inputs.append(filename);names.append(title)
# Source manifest: read-only facts and hashes, with no account data/secrets.
paths=['recommender/app/engine.py','recommender/app/schemas.py','backend/src/routes/recommendations.ts','backend/src/data/comfortPreferences.ts','backend/src/recommender.ts','src/services/recommendations/recommendationEngine.ts','src/screens/home/HomeScreen.tsx','src/services/journal/journalCrypto.ts','backend/src/routes/journal.ts','recommender/evaluation/metrics.py','recommender/evaluation/evaluation_results_production_onnx.json','recommender/evaluation/evaluation_results_comfort_onnx.json']
manifest={'inspection_date':'2026-10-03','purpose':'Identify the source inspected for this report; hashes do not imply new runtime testing.','files':[{'path':p,'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in paths]};(out/'evidence/source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for suite in ['production','comfort']:
 p=root/f'recommender/evaluation/evaluation_results_{suite}_onnx.json';shutil.copyfile(p,out/'evidence'/p.name)
(out/'evidence/benchmark-summary.csv').write_text('suite,approach,precision_at_4,ndcg_at_4,negative_label_percent,explicit_exclusion_percent,fill_rate,mean_warm_latency_ms\n'+''.join(f'{suite},{m["model_name"]},{m["precision_at_4"]},{m["ndcg_at_4"]},{m["safety_violation_rate"]},{m["explicit_exclusion_violation_rate"]},{m["fill_rate_at_4"]},{m["mean_latency_ms"]}\n' for suite in ['production','comfort'] for m in json.loads((out/'evidence'/f'evaluation_results_{suite}_onnx.json').read_text())['summary']))
(out/'chapters/appendix-d.tex').write_text(r'''\section{Current recommendation implementation evidence}
\label{sec:code-evidence}

This appendix identifies the source used to ground the five-stage explanation. It records inspection rather than a new runtime test. Source hashes in \path{evidence/source-manifest.json} distinguish this snapshot from later edits. The supplied benchmark JSON and summary CSV reproduce saved results rather than invented measurements.

\begin{description}[style=nextline,leftmargin=0pt,labelwidth=0pt,labelsep=0pt]
\item[Request construction and ownership]
\path{backend/src/routes/recommendations.ts}: check-in prerequisite, published catalogue, 180-day interaction aggregation, discomfort exclusions, HMAC pseudonyms, empty journals, and transactional persistence.
\item[Explicit comfort policy]
\path{backend/src/data/comfortPreferences.ts}: four comfort choices shared by backend and mobile fallback.
\item[Filtering, embeddings, scoring, and selection]
\path{recommender/app/engine.py}: hard eligibility, six field contributions, normalised ONNX vectors, conditional neighbours, cold/warm blends, recency, category diversity, and final-slot rotation.
\item[Mobile response and degraded operation]
\path{src/screens/home/HomeScreen.tsx} and \path{src/services/recommendations/recommendationEngine.ts}: preserve successful empty lists, map server IDs to displayable cards, and invoke the distinct local ranker on request failure.
\item[Metric definitions]
\path{recommender/evaluation/metrics.py}: relevance threshold, discounted gain, negative-label violations, diversity, and coverage. Performance values in the report come from the saved journal-free and comfort suites, not from the historical journal-containing suite.
\end{description}

The figures identify their evidence type: screenshots are dated interface records, architecture and workflow diagrams are source-based explanations, and quantitative charts reproduce saved evaluation data. No participant study, current full provider-login acceptance, clinical benefit, or new deployment is inferred from these artefacts.
''')
# main wrapper comes from separate editable template.
main=(root/'reports/working/latex-preamble.txt').read_text()
main+='\n\\begin{document}\n\\input{cover}\n\\pagenumbering{roman}\n\\input{chapters/00-abstract}\n\\clearpage\n{\\small\\setstretch{1.05}\\setlength{\\parskip}{0pt}\\tableofcontents}\n\\clearpage\n{\\small\\setstretch{1.10}\\listoffigures\\listoftables}\n\\clearpage\n\\pagenumbering{arabic}\n'
for name in inputs:
 if name=='00-abstract.tex' or name.startswith('appendix-'):continue
 main+=r'\clearpage\input{chapters/'+name[:-4]+'}\n'
main+=r'\clearpage\begingroup\setstretch{1.15}\input{references}\endgroup\clearpage\appendix'+'\n'
for name in [n for n in inputs if n.startswith('appendix-')]+['appendix-d.tex']:
 main+=r'\clearpage\input{chapters/'+name[:-4]+'}\n'
main+=r'\end{document}'+'\n';(out/'main.tex').write_text(main)
(out/'figure-manifest.csv').write_text('figure_number,label,file\n'+''.join(f'{i},fig:{k},figures/{k}.{"pdf" if k.startswith("recommendation-") else "png"}\n' for i,k in enumerate(figorder,1)))
print(f'Created LaTeX project: {len(figorder)} figures, {len(tables)} tables, {len(inputs)+1} content sections.'); print('Figures:', ', '.join(figorder))
