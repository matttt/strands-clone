import { puzzle } from './puzzle'
import { useState, useEffect } from 'react'
import { CEL } from './cel'
import { useSpring, useSprings, animated } from '@react-spring/web'
// @ts-ignore
import useSound from 'use-sound';



const TAN = '#DAD8C7'
const LIGHTBLUE = '#B8DEEC'
const DARKBLUE = '#397C9D'
const GOLD = '#F1CD51'

function Letter({ x, y, value, onClick, gridSideLength, setDragInProgress, pathLength }: { x: number, y: number, gridSideLength: number, value: string, onClick: () => void, setDragInProgress: (dragInProgress: boolean) => void, pathLength?: number }) {
    const handleMouseMove = (event: React.MouseEvent<SVGRectElement, MouseEvent>) => {
        if (event.buttons === 1) {
            if (pathLength && pathLength > 0) {
                setDragInProgress(true)
                onClick();
            }
        }
    }

    return (
        <animated.g onMouseDown={onClick} onMouseEnter={handleMouseMove} transform={`translate(${x}, ${y})`} style={{ userSelect: 'none' }}>
            <text
                fontSize={gridSideLength / 2}
                fill={'black'}
                textAnchor={'middle'}
                alignmentBaseline={'middle'}
                style={{ userSelect: 'none' }}
                y={gridSideLength / 32}
            >{value}</text>
            <rect
                x={-gridSideLength / 2}
                y={-gridSideLength / 2}
                width={gridSideLength * 2 / 3}
                height={gridSideLength * 2 / 3}
                fill={'white'}
                opacity={0}
                // stroke={'black'}
                // strokeWidth={2}
                cursor={'pointer'}
                rx={5}
                ry={5}
            />
        </animated.g>
    )
}


function Path({ path, gridSideLength, type, inProgress }: { path: number[][], gridSideLength: number, type: SubmittedWordType, inProgress: boolean }) {
    const [hasAnimated, setHasAnimated] = useState(false)

    const baseR = gridSideLength / 2.5

    const fill = type === SubmittedWordType.SPANAGRAM ? GOLD : type === SubmittedWordType.THEME ? LIGHTBLUE : TAN

    const [pathSprings, pathApi] = useSprings(path.length, (index) => ({
        from: { r: baseR, fill: TAN },
    }))

    const scaledPath = path.map(([x, y]) => [x * gridSideLength + gridSideLength / 2, y * gridSideLength + gridSideLength / 2])


    const [play] = useSound('/happy-pop.mp3', {
        volume: 0.5,
        interrupt: true
    });

    if (!inProgress && !hasAnimated) {

        let popCount = path.length;
        let playbackRate = 1

        const popFunc = () => {
            if (popCount > 0) {
                popCount--;
                play({ playbackRate: 1 + Math.random() * .04 });
                // play({playbackRate: playbackRate *= 1.05946});
                setTimeout(popFunc, 200)
            }
        }


        setTimeout(() => {
            popFunc();
            pathApi.start((index) => {
                return {
                    to: [{ r: baseR * 1.1, fill }, { r: baseR }],
                    delay: index * 200,
                    onRest: () => {
                        setHasAnimated(true)
                    }
                }
            })
        }, 250)


    }

    if (inProgress) {
        setTimeout(() => {
            pathApi.start((index) => {
                if (index === path.length - 1) {
                    return {
                        to: [{ r: baseR * .9 }, { r: baseR }],
                        config: { duration: 100 }
                    }
                }
            })
        }, 25)
    }


    const circles = scaledPath.map(([x, y], index) => {
        return (
            <animated.circle key={index} cx={x} cy={y} r={gridSideLength / 2.5} style={{ ...pathSprings[index] }} fill={fill} />
        )
    });

    const d = scaledPath.map(([x, y], index) => {
        if (index === 0) {
            return `M ${x} ${y}`
        } else {
            return `L ${x} ${y}`
        }
    }).join(' ')

    let selectionCircle = null
    if (scaledPath.length >= 4 && inProgress) {
        selectionCircle = <circle fill='none' stroke={fill} strokeWidth={3} cx={scaledPath[scaledPath.length - 1][0]} cy={scaledPath[scaledPath.length - 1][1]} r={gridSideLength / 2} />
    }

    return (
        <g>
            <path
                d={d}
                stroke={fill}
                strokeWidth={10}
                fill={'none'}
                strokeLinecap={'round'}
                strokeLinejoin={'round'}
            />
            {circles}
            {selectionCircle}
        </g>
    )
}

enum SubmittedWordType {
    THEME,
    SPANAGRAM,
    FILL
}
interface SubmittedWord {
    word: string
    coords: number[][]
    type: SubmittedWordType
}


interface GameProps {
    sideLength: number
}
export function Game({ sideLength }: GameProps) {
    const [grid, setGrid] = useState(puzzle.startingBoard.map(row => row.split('')))
    const [path, setPath] = useState<number[][]>([])
    const [submittedWords, setSubmittedWords] = useState<SubmittedWord[]>([])
    const [snackbarText, setSnackbarText] = useState('filler')
    const [dragInProgress, setDragInProgress] = useState(false)
    const [hintWordsRemaining, setHintWordsRemaining] = useState(3)

    const getWordFromPath = (path: number[][]) => {
        return path.map(([x, y]) => grid[y][x]).join('')
    }

    const [snackbarSprings, snackbarApi] = useSpring(() => ({
        from: { y: 0, opacity: 0 },
    }))

    const word = getWordFromPath(path)
    const isSpangram = word.toLowerCase() === puzzle.spangram.toLowerCase();

    const gridSideLength = sideLength / 8;

    const handleSnackbar = (text: string) => {
        setSnackbarText(text)
        snackbarApi.start({
            from: { y: 0, opacity: 0 },
            to: async (next) => {
                await next({ y: -10, opacity: 1 })
                await next({ opacity: 0 })
            }
        })
    }



    useEffect(() => {
        const handleMouseUp = () => {
            setDragInProgress(false)
            if (path.length > 0 && dragInProgress) {
                handleSubmit();
            }
        }
        document.addEventListener('mouseup', handleMouseUp);

        // @ts-ignore
        function preventBehavior(e) {
            e.preventDefault();
        };

        document.addEventListener("touchmove", preventBehavior, { passive: false });

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
        };
    });



    const handleSubmit = () => {
        if (CEL.includes(word.toLowerCase())) {
            if (word === puzzle.spangram) {
                handleSnackbar('Spangram!')
                setSubmittedWords([...submittedWords, { word, coords: path, type: SubmittedWordType.SPANAGRAM }])
                // @ts-ignore
            } else if (puzzle.themeCoords[word]) {
                handleSnackbar('Theme!')
                setSubmittedWords([...submittedWords, { word, coords: path, type: SubmittedWordType.THEME }])
            } else {
                handleSnackbar('Fill!')

                if (hintWordsRemaining === 0) {
                    alert('implement show hint here!!')
                } else {
                    setHintWordsRemaining(hintWordsRemaining - 1)
                }
                // setSubmittedWords([...submittedWords, { word, coords: path, type: SubmittedWordType.FILL }])
            }

            setPath([])
        } else {
            handleSnackbar('Not a word')
            setTimeout(() => {
                setPath([])
            }, 500)
        }
    }


    const handleClick = (rowIndex: number, colIndex: number) => {
        console.log(rowIndex, colIndex)
        if (path.length === 0) {
            setPath([[colIndex, rowIndex]])
        } else if (path[path.length - 1][0] === colIndex && path[path.length - 1][1] === rowIndex) {
            handleSubmit()
        } else {
            const last = path[path.length - 1]

            // not the same letter again
            if (rowIndex === last[1] && colIndex === last[0]) return;

            // not a previous letter again
            if (path.some(([x, y]) => x === colIndex && y === rowIndex)) return;

            if (Math.abs(colIndex - last[0]) <= 1 && Math.abs(rowIndex - last[1]) <= 1) {
                setPath([...path, [colIndex, rowIndex]])
            }
        }
    }

    const letters = grid.map((row, rowIndex) => row.map((letter, colIndex) => {
        const x = colIndex * gridSideLength + gridSideLength / 2;
        const y = rowIndex * gridSideLength + gridSideLength / 2;

        return (
            <Letter
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleClick(rowIndex, colIndex)}
                setDragInProgress={setDragInProgress}
                pathLength={path.length}
                x={x}
                y={y}
                value={letter}
                gridSideLength={gridSideLength} />
        )
    }))

    const pathEl = path.length > 0 && <Path path={path} gridSideLength={gridSideLength} type={SubmittedWordType.FILL} inProgress={true} />

    const prevPathEls = submittedWords.map(({ coords, type }, index) => {
        return <Path key={index} path={coords} gridSideLength={gridSideLength} type={type} inProgress={false} />
    })

    const rightPanel = <div className='w-2/4 flex'>
        <div className='grow'></div>
        <div>
            <div className='w-full flex'>
                <div className='grow'></div>
                <animated.div className={`px-3 py-2 border border-gray-300 rounded mx-auto`} style={{ backgroundColor: isSpangram ? GOLD : 'white', ...snackbarSprings }}>{snackbarText}</animated.div>
                <div className='grow'></div>
            </div>
            <div className='w-full flex h-3'>
                <div className='grow'></div>
                <span className='text-4xl'>{word}</span>
                <div className='grow'></div>
            </div>
            <div className='h-10'></div>
            <svg style={{ width: sideLength * 6 / 8, height: sideLength }}>
                {/* <rect width={sideLength*6/8} height={sideLength} fill={'red'}></rect> */}
                {prevPathEls}
                {pathEl}
                {letters}
            </svg>
        </div>
        <div className='grow'></div>

    </div>

    const themeWordMax = Object.keys(puzzle.themeCoords).length + 1; // plus one for spangram
    const themeWordCount = submittedWords.length;

    const leftPanel = <div className='w-2/4 flex flex-col'>
        <div className='grow'></div>
        <div className='flex'>
            <div className='grow'></div>
            <div className='rounded-xl border border-slate-400 w-3/4'>
                <h3 className='bg-sky-200 w-full text-center font-semibold rounded-t-xl py-2'>{`TODAY'S THEME`}</h3>
                <h1 className='font-bold text-3xl py-5 w-full text-center'>
                    {puzzle.clue}
                </h1>
            </div>
            <div className='grow'></div>
        </div>
        <div className=' w-full'>
            <h2 className='text-3xl py-10 w-full text-center'>
                <span className='font-bold'>{themeWordCount}</span> of <span className='font-bold'>{themeWordMax}</span> theme words found.
            </h2>
        </div>
        <div className=' w-full flex'>
            <div className='grow'></div>
            <div>
                <button style={{ backgroundColor: TAN, clipPath: `inset(0px ${((hintWordsRemaining / 3)) * 100}% 0px 0px)`, transition: 'clip-path 100ms' }} className={`absolute border border-black border-[3px] py-3 px-[40px] rounded-full font-bold text-2xl text-black`}>Hint</button>
                <button className=' border border-[#CFCFCF] border-[3px] py-3 px-[40px] rounded-full font-bold text-2xl text-[#CFCFCF]'>Hint</button>
            </div>
            <div className='grow'></div>
        </div>
        <div className='grow'></div>
    </div>

    return (
        <div className='w-full flex'>
            <div className='w-[15vw]'></div>
            {leftPanel}
            <div className='grow'></div>
            {rightPanel}
            <div className='w-[15vw]'></div>
        </div>
    )
}