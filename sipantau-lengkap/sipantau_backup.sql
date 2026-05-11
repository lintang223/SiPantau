--
-- PostgreSQL database dump
--

\restrict 2RAWCFl7XJs9DvTD584Imif8x39lHI3s5pjIwpYsoSU9AJBCafRHoVGGIzvDYW6

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-29 08:52:08

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 16390)
-- Name: hasil_scraping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hasil_scraping (
    id integer NOT NULL,
    session_id text,
    keyword text,
    nama_produk text,
    harga bigint,
    platform text,
    rating real,
    terjual text,
    url_produk text,
    gambar_url text,
    waktu_scrape text,
    username text
);


ALTER TABLE public.hasil_scraping OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: hasil_scraping_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hasil_scraping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hasil_scraping_id_seq OWNER TO postgres;

--
-- TOC entry 5036 (class 0 OID 0)
-- Dependencies: 219
-- Name: hasil_scraping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hasil_scraping_id_seq OWNED BY public.hasil_scraping.id;


--
-- TOC entry 222 (class 1259 OID 16400)
-- Name: riwayat_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.riwayat_session (
    id integer NOT NULL,
    session_id text,
    keyword text,
    platforms text,
    jumlah_data integer,
    status text,
    file_excel text,
    waktu text,
    username text
);


ALTER TABLE public.riwayat_session OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16399)
-- Name: riwayat_session_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.riwayat_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.riwayat_session_id_seq OWNER TO postgres;

--
-- TOC entry 5037 (class 0 OID 0)
-- Dependencies: 221
-- Name: riwayat_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.riwayat_session_id_seq OWNED BY public.riwayat_session.id;


--
-- TOC entry 224 (class 1259 OID 16410)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    nama text,
    role text DEFAULT 'user'::text,
    created_at text,
    password_plain text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16409)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5038 (class 0 OID 0)
-- Dependencies: 223
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4866 (class 2604 OID 16393)
-- Name: hasil_scraping id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hasil_scraping ALTER COLUMN id SET DEFAULT nextval('public.hasil_scraping_id_seq'::regclass);


--
-- TOC entry 4867 (class 2604 OID 16403)
-- Name: riwayat_session id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riwayat_session ALTER COLUMN id SET DEFAULT nextval('public.riwayat_session_id_seq'::regclass);


--
-- TOC entry 4868 (class 2604 OID 16413)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5026 (class 0 OID 16390)
-- Dependencies: 220
-- Data for Name: hasil_scraping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hasil_scraping (id, session_id, keyword, nama_produk, harga, platform, rating, terjual, url_produk, gambar_url, waktu_scrape, username) FROM stdin;
1	20260427_143145	gading gajah	Kayu Jati gading gajah #49	40389	Tokopedia	4.8	235rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
2	20260427_143145	gading gajah	Kayu Jati gading gajah #97	288143	Tokopedia	4.1	459rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
3	20260427_143145	gading gajah	Bambu gading gajah #66	123075	Tokopedia	4.2	261rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
4	20260427_143145	gading gajah	Gaharu gading gajah #61	269154	Tokopedia	3.1	201rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
5	20260427_143145	gading gajah	Rotan gading gajah #56	164761	Tokopedia	3.8	443rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
6	20260427_143145	gading gajah	Bambu gading gajah #61	496388	Tokopedia	3.9	97rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
7	20260427_143145	gading gajah	Gaharu gading gajah #32	205247	Tokopedia	4.6	171rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
8	20260427_143145	gading gajah	Madu Hutan gading gajah #46	383257	Tokopedia	3.5	335rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
9	20260427_143145	gading gajah	Gaharu gading gajah #26	343135	Tokopedia	4.6	374rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
10	20260427_143145	gading gajah	Madu Hutan gading gajah #69	379234	Tokopedia	3.9	413rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-27 14:31:45	\N
11	20260428_094825	kayu	Kayu Jati kayu #9	426946	Lazada	3.3	367rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
12	20260428_094825	kayu	Madu Hutan kayu #65	429991	Lazada	3.1	499rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
13	20260428_094825	kayu	Gaharu kayu #33	212964	Lazada	4.8	68rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
14	20260428_094825	kayu	Rotan kayu #48	235377	Lazada	4.3	97rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
15	20260428_094825	kayu	Kayu Sengon kayu #44	93112	Lazada	4.8	304rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
16	20260428_094825	kayu	Rotan kayu #5	297296	Lazada	4	350rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
17	20260428_094825	kayu	Rotan kayu #23	245428	Lazada	3.7	239rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
18	20260428_094825	kayu	Gaharu kayu #15	69144	Lazada	3.9	274rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
19	20260428_094825	kayu	Madu Hutan kayu #19	271796	Lazada	4.2	258rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
20	20260428_094825	kayu	Rotan kayu #70	103268	Lazada	4.8	252rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
21	20260428_094825	kayu	Gaharu kayu #17	160745	Lazada	4.7	323rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
22	20260428_094825	kayu	Kayu Sengon kayu #2	430717	Lazada	4.6	384rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
23	20260428_094825	kayu	Gaharu kayu #12	142381	Lazada	3.5	195rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
24	20260428_094825	kayu	Kayu Jati kayu #77	91154	Lazada	4.1	315rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
25	20260428_094825	kayu	Kayu Jati kayu #64	267887	Lazada	4.9	84rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
26	20260428_094825	kayu	Madu Hutan kayu #77	74561	Lazada	4.7	4rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
27	20260428_094825	kayu	Gaharu kayu #14	57940	Lazada	4.7	159rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
28	20260428_094825	kayu	Gaharu kayu #20	34773	Lazada	4	155rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
29	20260428_094825	kayu	Bambu kayu #92	496424	Lazada	4.6	404rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
30	20260428_094825	kayu	Madu Hutan kayu #84	276221	Lazada	3.1	355rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
31	20260428_094825	kayu	Madu Hutan kayu #33	135712	Lazada	4.3	98rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
32	20260428_094825	kayu	Rotan kayu #16	388183	Lazada	4.1	14rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
33	20260428_094825	kayu	Madu Hutan kayu #89	43369	Lazada	4.4	15rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
34	20260428_094825	kayu	Madu Hutan kayu #42	246775	Lazada	3.4	322rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
35	20260428_094825	kayu	Madu Hutan kayu #79	261737	Lazada	4.9	244rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
36	20260428_094825	kayu	Gaharu kayu #83	440297	Lazada	3.9	459rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
37	20260428_094825	kayu	Bambu kayu #90	243503	Lazada	4.1	456rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
38	20260428_094825	kayu	Bambu kayu #43	259045	Lazada	3.2	78rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
39	20260428_094825	kayu	Bambu kayu #36	411014	Lazada	3.4	37rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
40	20260428_094825	kayu	Bambu kayu #2	171122	Lazada	4	59rb+	https://lazada.co.id/produk/kayu		2026-04-28 09:48:25	lintang
41	20260428_095636	sisik tringgilling	Kayu Sengon sisik tringgilling #19	240936	Tokopedia	4.3	337rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
42	20260428_095636	sisik tringgilling	Madu Hutan sisik tringgilling #94	35004	Tokopedia	3	340rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
43	20260428_095636	sisik tringgilling	Gaharu sisik tringgilling #97	256456	Tokopedia	3.7	274rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
44	20260428_095636	sisik tringgilling	Gaharu sisik tringgilling #34	256144	Tokopedia	4.7	267rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
45	20260428_095636	sisik tringgilling	Kayu Jati sisik tringgilling #69	462511	Tokopedia	4.5	217rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
46	20260428_095636	sisik tringgilling	Kayu Jati sisik tringgilling #31	226696	Tokopedia	3.5	452rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
47	20260428_095636	sisik tringgilling	Kayu Sengon sisik tringgilling #10	460559	Tokopedia	3.5	241rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
48	20260428_095636	sisik tringgilling	Madu Hutan sisik tringgilling #75	267155	Tokopedia	3.1	246rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
49	20260428_095636	sisik tringgilling	Bambu sisik tringgilling #36	103402	Tokopedia	4.8	474rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
50	20260428_095636	sisik tringgilling	Madu Hutan sisik tringgilling #10	478431	Tokopedia	4.6	404rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
51	20260428_095636	sisik tringgilling	Kayu Sengon sisik tringgilling #44	183445	Tokopedia	4.9	416rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
52	20260428_095636	sisik tringgilling	Kayu Jati sisik tringgilling #19	400799	Tokopedia	3	393rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
53	20260428_095636	sisik tringgilling	Kayu Jati sisik tringgilling #30	142933	Tokopedia	4	333rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
54	20260428_095636	sisik tringgilling	Bambu sisik tringgilling #16	284418	Tokopedia	3.7	203rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
55	20260428_095636	sisik tringgilling	Kayu Sengon sisik tringgilling #38	458544	Tokopedia	4.8	89rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
56	20260428_095636	sisik tringgilling	Gaharu sisik tringgilling #55	140539	Tokopedia	3.3	291rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
57	20260428_095636	sisik tringgilling	Gaharu sisik tringgilling #40	281178	Tokopedia	4.2	216rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
58	20260428_095636	sisik tringgilling	Kayu Sengon sisik tringgilling #19	434481	Tokopedia	3.7	102rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
59	20260428_095636	sisik tringgilling	Gaharu sisik tringgilling #17	390716	Tokopedia	4.4	489rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
60	20260428_095636	sisik tringgilling	Kayu Jati sisik tringgilling #56	265686	Tokopedia	4.4	165rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
61	20260428_095636	sisik tringgilling	Rotan sisik tringgilling #92	380236	Tokopedia	3.6	37rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
62	20260428_095636	sisik tringgilling	Kayu Sengon sisik tringgilling #76	193501	Tokopedia	4.9	232rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
63	20260428_095636	sisik tringgilling	Kayu Sengon sisik tringgilling #28	144620	Tokopedia	4.6	314rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
64	20260428_095636	sisik tringgilling	Madu Hutan sisik tringgilling #47	212581	Tokopedia	3.2	488rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
65	20260428_095636	sisik tringgilling	Gaharu sisik tringgilling #5	276683	Tokopedia	4.9	327rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
66	20260428_095636	sisik tringgilling	Rotan sisik tringgilling #93	436001	Tokopedia	4.9	72rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
67	20260428_095636	sisik tringgilling	Bambu sisik tringgilling #2	187964	Tokopedia	3.4	358rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
68	20260428_095636	sisik tringgilling	Gaharu sisik tringgilling #19	79919	Tokopedia	3.7	276rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
69	20260428_095636	sisik tringgilling	Gaharu sisik tringgilling #35	443942	Tokopedia	4.8	252rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
70	20260428_095636	sisik tringgilling	Rotan sisik tringgilling #60	449335	Tokopedia	3.3	44rb+	https://tokopedia.co.id/produk/sisik-tringgilling		2026-04-28 09:56:36	admin
71	20260428_104054	gading gajah	Kayu Sengon gading gajah #60	318518	Tokopedia	4.3	242rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
72	20260428_104054	gading gajah	Madu Hutan gading gajah #74	19661	Tokopedia	3.8	70rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
73	20260428_104054	gading gajah	Madu Hutan gading gajah #64	488024	Tokopedia	4.1	20rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
74	20260428_104054	gading gajah	Bambu gading gajah #37	439126	Tokopedia	3.8	48rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
75	20260428_104054	gading gajah	Kayu Sengon gading gajah #81	417074	Tokopedia	4.8	393rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
76	20260428_104054	gading gajah	Madu Hutan gading gajah #20	309118	Tokopedia	4.2	23rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
77	20260428_104054	gading gajah	Bambu gading gajah #88	71581	Tokopedia	4.3	143rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
78	20260428_104054	gading gajah	Bambu gading gajah #6	481929	Tokopedia	4.4	292rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
79	20260428_104054	gading gajah	Gaharu gading gajah #60	340573	Tokopedia	3.2	213rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
80	20260428_104054	gading gajah	Kayu Jati gading gajah #57	380419	Tokopedia	3.1	118rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
81	20260428_104054	gading gajah	Madu Hutan gading gajah #80	106159	Tokopedia	4.6	49rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
82	20260428_104054	gading gajah	Kayu Sengon gading gajah #82	366726	Tokopedia	3.8	238rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
83	20260428_104054	gading gajah	Bambu gading gajah #67	308574	Tokopedia	3.4	119rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
84	20260428_104054	gading gajah	Madu Hutan gading gajah #30	248859	Tokopedia	4.7	61rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
85	20260428_104054	gading gajah	Kayu Jati gading gajah #77	499591	Tokopedia	4.6	201rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
86	20260428_104054	gading gajah	Madu Hutan gading gajah #23	410629	Tokopedia	4.4	315rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
87	20260428_104054	gading gajah	Rotan gading gajah #58	392235	Tokopedia	3.9	459rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
88	20260428_104054	gading gajah	Bambu gading gajah #53	338089	Tokopedia	3.5	403rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
89	20260428_104054	gading gajah	Kayu Jati gading gajah #47	166734	Tokopedia	4.2	178rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
90	20260428_104054	gading gajah	Gaharu gading gajah #39	407556	Tokopedia	4.6	161rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
91	20260428_104054	gading gajah	Kayu Sengon gading gajah #45	458448	Tokopedia	4.6	353rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
92	20260428_104054	gading gajah	Kayu Sengon gading gajah #79	191096	Tokopedia	3.1	315rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
93	20260428_104054	gading gajah	Madu Hutan gading gajah #11	77583	Tokopedia	4.2	482rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
94	20260428_104054	gading gajah	Bambu gading gajah #6	156204	Tokopedia	4.4	236rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
95	20260428_104054	gading gajah	Kayu Sengon gading gajah #99	97262	Tokopedia	3.4	9rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
96	20260428_104054	gading gajah	Kayu Jati gading gajah #99	280887	Tokopedia	3.6	33rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
97	20260428_104054	gading gajah	Rotan gading gajah #70	112093	Tokopedia	4.6	19rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
98	20260428_104054	gading gajah	Rotan gading gajah #54	348673	Tokopedia	4.6	23rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
99	20260428_104054	gading gajah	Gaharu gading gajah #30	19316	Tokopedia	4.1	227rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
100	20260428_104054	gading gajah	Rotan gading gajah #39	251839	Tokopedia	3.8	150rb+	https://tokopedia.co.id/produk/gading-gajah		2026-04-28 10:40:54	udin
\.


--
-- TOC entry 5028 (class 0 OID 16400)
-- Dependencies: 222
-- Data for Name: riwayat_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.riwayat_session (id, session_id, keyword, platforms, jumlah_data, status, file_excel, waktu, username) FROM stdin;
1	20260427_143145	gading gajah	tokopedia	10	Selesai	\N	2026-04-27 14:31:45	\N
2	20260428_094825	kayu	lazada	30	Selesai	\N	2026-04-28 09:48:25	lintang
3	20260428_095636	sisik tringgilling	tokopedia	30	Selesai	\N	2026-04-28 09:56:36	admin
4	20260428_104054	gading gajah	tokopedia	30	Selesai	\N	2026-04-28 10:40:54	udin
\.


--
-- TOC entry 5030 (class 0 OID 16410)
-- Dependencies: 224
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, nama, role, created_at, password_plain) FROM stdin;
1	admin	5e29d81a7fdcd486db0671a6e5537c253056083bda5d287bd024dbe4f510f152	Administrator	admin	2026-04-27 14:52:13	\N
4	udin	8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92	udin	user	2026-04-28 10:39:52	123456
\.


--
-- TOC entry 5039 (class 0 OID 0)
-- Dependencies: 219
-- Name: hasil_scraping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hasil_scraping_id_seq', 100, true);


--
-- TOC entry 5040 (class 0 OID 0)
-- Dependencies: 221
-- Name: riwayat_session_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.riwayat_session_id_seq', 4, true);


--
-- TOC entry 5041 (class 0 OID 0)
-- Dependencies: 223
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- TOC entry 4871 (class 2606 OID 16398)
-- Name: hasil_scraping hasil_scraping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hasil_scraping
    ADD CONSTRAINT hasil_scraping_pkey PRIMARY KEY (id);


--
-- TOC entry 4873 (class 2606 OID 16408)
-- Name: riwayat_session riwayat_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riwayat_session
    ADD CONSTRAINT riwayat_session_pkey PRIMARY KEY (id);


--
-- TOC entry 4875 (class 2606 OID 16421)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4877 (class 2606 OID 16423)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


-- Completed on 2026-04-29 08:52:08

--
-- PostgreSQL database dump complete
--

\unrestrict 2RAWCFl7XJs9DvTD584Imif8x39lHI3s5pjIwpYsoSU9AJBCafRHoVGGIzvDYW6

